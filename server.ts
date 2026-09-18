import express from "express";
import "dotenv/config";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { getAdminAuth, getAdminDb } from './src/lib/firebaseAdmin';

async function startServer() {
  const app = express();
  const PORT = 3000;
  const DB_FILE = path.join(process.cwd(), "db.json");
  const requestWindows = new Map<string, { count: number; resetAt: number }>();
  const maxTempPhotoBytes = 128 * 1024 * 1024;
  const maxTempSessionBytes = 16 * 1024 * 1024;
  let tempPhotoBytes = 0;

  const secMetrics = { blocked: 0, total: 0, rps: 0, lastBlocked: '' };
  let rpsWindow = { count: 0, startAt: Date.now() };
  setInterval(() => {
    const elapsed = (Date.now() - rpsWindow.startAt) / 1000;
    secMetrics.rps = elapsed > 0 ? Math.round(rpsWindow.count / elapsed) : 0;
    rpsWindow = { count: 0, startAt: Date.now() };
  }, 5000);
  setInterval(() => {
    const now = Date.now();
    for (const [address, state] of requestWindows) {
      if (state.resetAt <= now) requestWindows.delete(address);
    }
  }, 60_000);

  const verifyAdmin = async (req: express.Request, res: express.Response): Promise<boolean> => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Yetkisiz erisim: Token bulunamadi.' });
      return false;
    }
    try {
      const token = await getAdminAuth().verifyIdToken(auth.slice(7));
      const snap = await getAdminDb().collection('users').doc(token.uid).get();
      if (!snap.exists || (snap.data() as any)?.role !== 'admin') {
        res.status(403).json({ error: 'Erisim engellendi: Yonetici yetkisi gereklidir.' });
        return false;
      }
      return true;
    } catch (_err) {
      res.status(401).json({ error: 'Gecersiz veya suresi dolmus token.' });
      return false;
    }
  };

  app.disable("x-powered-by");
  app.set('trust proxy', 1);
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

    if (!req.path.startsWith("/api/")) {
      next();
      return;
    }

    secMetrics.total++;
    rpsWindow.count++;

    const now = Date.now();
    const address = req.ip || req.socket.remoteAddress || "unknown";
    const windowState = requestWindows.get(address);
    if (!windowState || windowState.resetAt <= now) {
      requestWindows.set(address, { count: 1, resetAt: now + 60_000 });
      next();
      return;
    }

    if (windowState.count >= 120) {
      secMetrics.blocked++;
      secMetrics.lastBlocked = new Date().toISOString();
      res.setHeader("Retry-After", Math.ceil((windowState.resetAt - now) / 1000));
      res.status(429).json({ error: "Cok fazla istek gonderildi. Lutfen kisa sure sonra tekrar deneyin." });
      return;
    }

    windowState.count += 1;
    next();
  });

  // In-memory store for mobile uploads with bounded per-session storage.
  const tempPhotos = new Map<string, { photos: string[]; bytes: number }>();

  // Thread-safe FIFO Task Queue to serialize all database operations
  class TaskQueue {
    private queue: (() => Promise<any>)[] = [];
    private running = false;

    async add<T>(task: () => Promise<T>): Promise<T> {
      return new Promise<T>((resolve, reject) => {
        this.queue.push(async () => {
          try {
            const res = await task();
            resolve(res);
          } catch (err) {
            reject(err);
          }
        });
        this.runNext();
      });
    }

    private async runNext() {
      if (this.running || this.queue.length === 0) return;
      this.running = true;
      const task = this.queue.shift();
      if (task) {
        try {
          await task();
        } catch (e) {
          console.error("Queue task failed:", e);
        }
      }
      this.running = false;
      this.runNext();
    }
  }

  const dbQueue = new TaskQueue();
  let dbCache: any = null;

  const sendTelegramMessage = async (chatId: string, message: string): Promise<boolean> => {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken || !chatId) return false;
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message })
    });
    return response.ok;
  };

  // Load database state into memory cache if not loaded
  function getDb(): any {
    if (dbCache) {
      if (Array.isArray(dbCache.products) && dbCache.products.length > 25) {
        dbCache.products = dbCache.products.slice(0, 25);
        saveDb();
      }
      return dbCache;
    }
    if (fs.existsSync(DB_FILE)) {
      try {
        dbCache = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
        if (Array.isArray(dbCache.products) && dbCache.products.length > 25) {
          dbCache.products = dbCache.products.slice(0, 25);
          saveDb();
        }
        return dbCache;
      } catch (e) {
        console.error("Failed to read db.json, creating fallback cache structure:", e);
      }
    }
    dbCache = {
      products: [],
      dealers: [],
      orders: [],
      commissionRequests: [],
      storeSettings: {}
    };
    return dbCache;
  }

  // Save memory cache to db.json
  function saveDb(): void {
    if (dbCache) {
      fs.writeFileSync(DB_FILE, JSON.stringify(dbCache, null, 2), "utf-8");
    }
  }

  // API Route: POST /api/upload-temp (from phone/tablet)
  app.post("/api/upload-temp", express.json({ limit: "15mb" }), (req, res) => {
    try {
      const { code, imageData } = req.body;
      if (typeof code !== "string" || !/^sess-[0-9]{6}$/.test(code) || typeof imageData !== "string" || !imageData.startsWith("data:image/")) {
        return res.status(400).json({ error: "Geçersiz oturum kodu veya görsel verisi" });
      }

      const photoBytes = Buffer.byteLength(imageData, 'utf8');
      if (photoBytes > maxTempSessionBytes) {
        return res.status(413).json({ error: "Görsel boyutu bu oturum için çok büyük" });
      }
      if (tempPhotoBytes + photoBytes > maxTempPhotoBytes) {
        return res.status(413).json({ error: "Geçici görsel alanı dolu, lütfen daha sonra tekrar deneyin" });
      }

      if (tempPhotos.size >= 100 && !tempPhotos.has(code)) {
        const firstKey = tempPhotos.keys().next().value;
        if (firstKey) {
          const removed = tempPhotos.get(firstKey);
          tempPhotoBytes -= removed?.bytes || 0;
          tempPhotos.delete(firstKey);
        }
      }

      const session = tempPhotos.get(code) || { photos: [], bytes: 0 };
      if (session.photos.length >= 20 || session.bytes + photoBytes > maxTempSessionBytes) {
        return res.status(413).json({ error: "Bu oturum için görsel sınırına ulaşıldı" });
      }

      session.photos.push(imageData);
      session.bytes += photoBytes;
      tempPhotoBytes += photoBytes;
      tempPhotos.set(code, session);
      return res.json({ status: "ok", count: session.photos.length });
    } catch (e) {
      console.error("Temp photo upload failed:", e);
      return res.status(500).json({ error: "Görsel yüklenemedi" });
    }
  });

  // API Route: GET /api/temp-photos (from desktop dashboard form)
  app.get("/api/temp-photos", (req, res) => {
    const code = typeof req.query.code === "string" ? req.query.code : "";
    if (!/^sess-[0-9]{6}$/.test(code)) {
      return res.status(400).json({ error: "Geçersiz oturum kodu" });
    }
    return res.json({ photos: tempPhotos.get(code)?.photos || [] });
  });

  // API Route: POST /api/clear-temp-photos
  app.post("/api/clear-temp-photos", express.json(), (req, res) => {
    const code = typeof req.body?.code === "string" ? req.body.code : "";
    if (!/^sess-[0-9]{6}$/.test(code)) {
      return res.status(400).json({ error: "Geçersiz oturum kodu" });
    }
    const session = tempPhotos.get(code);
    if (session) tempPhotoBytes -= session.bytes;
    tempPhotos.delete(code);
    return res.json({ status: "ok" });
  });

  // Yonetici gerektiren route'lari koru
  app.use(['/api/db', '/api/transaction', '/api/telegram'], async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ok = await verifyAdmin(req, res);
    if (ok) next();
  });

  app.post('/api/auth/dealers', express.json(), async (req: express.Request, res: express.Response) => {
    if (!(await verifyAdmin(req, res))) return;

    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const displayName = typeof req.body?.displayName === 'string' ? req.body.displayName.trim() : '';

    if (!email || !password || password.length < 6 || !displayName) {
      return res.status(400).json({ error: 'Geçerli bayi e-postası, adı ve en az 6 karakterli şifre gereklidir.' });
    }

    try {
      const auth = getAdminAuth();
      let user;
      try {
        user = await auth.getUserByEmail(email);
        user = await auth.updateUser(user.uid, { email, password, displayName, disabled: false });
      } catch (error) {
        if ((error as { code?: string }).code !== 'auth/user-not-found') throw error;
        user = await auth.createUser({ email, password, displayName, disabled: false });
      }
      return res.json({ uid: user.uid, email: user.email });
    } catch (error) {
      console.error('Bayi Firebase Authentication hesabı oluşturulamadı:', error);
      return res.status(400).json({ error: 'Bayi giriş hesabı oluşturulamadı. E-posta daha önce başka bir hesapta kullanılmış olabilir.' });
    }
  });

  // API Route: GET /api/security/stats (acik - sadece metrik dondurur)
  app.get("/api/security/stats", (_req, res) => {
    res.json({
      blockedRequests: secMetrics.blocked,
      totalApiRequests: secMetrics.total,
      rps: secMetrics.rps,
      lastBlockedAt: secMetrics.lastBlocked || null,
      activeConnections: requestWindows.size,
    });
  });

  // API Route: GET /api/db
  app.get("/api/db", (_req, res) => {
    try {
      const data = getDb();
      return res.json({ initialized: true, ...data });
    } catch (e) {
      console.error("Failed to read database state:", e);
      return res.status(500).json({ error: "Failed to read database state" });
    }
  });

  // API Route: POST /api/db (Bootstrap & general overwrite fallback)
  app.post("/api/db", express.json({ limit: "25mb" }), async (req, res) => {
    try {
      const data = req.body;
      await dbQueue.add(async () => {
        dbCache = data;
        saveDb();
      });
      return res.json({ status: "ok" });
    } catch (e) {
      console.error("Failed to write database file:", e);
      return res.status(500).json({ error: "Failed to write database file" });
    }
  });

  // API Route: POST /api/telegram/test
  app.post('/api/telegram/test', express.json(), async (req, res) => {
    const chatId = typeof req.body?.chatId === 'string' ? req.body.chatId.trim() : '';
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      return res.status(503).json({ message: 'Sunucuda TELEGRAM_BOT_TOKEN tanımlı değil.' });
    }
    if (!chatId) {
      return res.status(400).json({ message: 'Chat ID gereklidir.' });
    }
    try {
      const sent = await sendTelegramMessage(chatId, 'Buğurca Kırtasiye Telegram bağlantı testi başarılı.');
      return sent ? res.json({ status: 'ok', message: 'Test mesajı gönderildi.' }) : res.status(502).json({ message: 'Telegram mesajı gönderilemedi.' });
    } catch {
      return res.status(502).json({ message: 'Telegram servisine ulaşılamadı.' });
    }
  });

  // API Route: POST /api/transaction (Highly concurrent transactional endpoint)
  app.post("/api/transaction", express.json({ limit: "25mb" }), async (req, res) => {
    const { action, data } = req.body;
    if (!action) {
      return res.status(400).json({ error: "Action name is required" });
    }

    try {
      const result = await dbQueue.add(async () => {
        // Ensure cache is populated
        const db = getDb();
        let payload: any = {};
        let telegramMessage: string | null = null;

        switch (action) {
          case "createOrder": {
            const { order } = data;
            // Generate unique Order ID
            let newId = order.orderReference || `sip-${Date.now().toString().slice(-4)}`;
            let collisionCounter = 1;
            while ((db.orders || []).some((o: any) => o.id === newId)) {
              newId = `sip-${Date.now().toString().slice(-4)}-${collisionCounter}`;
              collisionCounter++;
            }

            // Find dealer
            const dealer = (db.dealers || []).find((d: any) => d.id === order.dealerId);
            const activeRate = (dealer && dealer.commissionRate !== undefined) ? dealer.commissionRate : db.storeSettings.commissionRate;
            const commissionRateFraction = activeRate / 100;

            let commissionAmount = 0;
            let adminCommissionAmount = 0;

            if (order.isFromDealerPage) {
              // Private product
              const adminPrivateRate = (dealer && dealer.privateCommissionRate !== undefined)
                ? dealer.privateCommissionRate
                : (db.storeSettings.defaultPrivateCommissionRate !== undefined ? db.storeSettings.defaultPrivateCommissionRate : 5.0);

              adminCommissionAmount = Number((order.totalPrice * (adminPrivateRate / 100)).toFixed(2));
              commissionAmount = Number((order.totalPrice - adminCommissionAmount).toFixed(2));
            } else {
              // Central product
              commissionAmount = Number((order.totalPrice * commissionRateFraction).toFixed(2));

              const sector = order.selectedSector || dealer?.sector || 'Kırtasiye';
              const adminCommissions = db.storeSettings.sectorAdminCommissions || {};
              const adminRate = (dealer && dealer.adminSectorCommissionRate !== undefined)
                ? dealer.adminSectorCommissionRate
                : (adminCommissions[sector] !== undefined ? adminCommissions[sector] : 3.0);
              adminCommissionAmount = Number((order.totalPrice * (adminRate / 100)).toFixed(2));
            }

            // Update admin earned commissions pool
            db.storeSettings.adminEarnedCommissions = Number(((db.storeSettings.adminEarnedCommissions || 0) + adminCommissionAmount).toFixed(2));

            const newOrder = {
              ...order,
              id: newId,
              date: new Date().toISOString(),
              commissionAmount,
              adminCommissionAmount,
              status: order.status || 'completed',
              createdBy: order.createdBy || 'customer',
              adminApproved: order.adminApproved !== undefined ? order.adminApproved : true
            };

            if (!db.orders) db.orders = [];
            db.orders.push(newOrder);

            // Decrement stock for purchased products
            if (order.items && Array.isArray(order.items)) {
              order.items.forEach((item: any) => {
                const product = (db.products || []).find((p: any) => p.id === item.productId);
                if (product) {
                  product.stock = Math.max(0, (product.stock || 0) - (item.quantity || 0));
                }
              });
            }

            // Recalculate ciro/commissions for all dealers for 100% data integrity
            const settings = db.storeSettings;
            (db.dealers || []).forEach((d: any) => {
              const dActiveRate = d.commissionRate !== undefined ? d.commissionRate : settings.commissionRate;
              const dRateFraction = dActiveRate / 100;

              const dealerCompletedOrders = (db.orders || []).filter(
                (o: any) => o.dealerId === d.id && o.status === 'completed' && o.adminApproved !== false
              );

              dealerCompletedOrders.forEach((o: any) => {
                if (o.isFromDealerPage) {
                  const adminPrivateRate = d.privateCommissionRate !== undefined
                    ? d.privateCommissionRate
                    : (settings.defaultPrivateCommissionRate !== undefined ? settings.defaultPrivateCommissionRate : 5.0);

                  o.adminCommissionAmount = Number((o.totalPrice * (adminPrivateRate / 100)).toFixed(2));
                  o.commissionAmount = Number((o.totalPrice - o.adminCommissionAmount).toFixed(2));
                } else {
                  o.commissionAmount = Number((o.totalPrice * dRateFraction).toFixed(2));

                  const sector = o.selectedSector || d.sector || 'Kırtasiye';
                  const adminCommissions = settings.sectorAdminCommissions || {};
                  const adminRate = d.adminSectorCommissionRate !== undefined
                    ? d.adminSectorCommissionRate
                    : (adminCommissions[sector] !== undefined ? adminCommissions[sector] : 3.0);
                  o.adminCommissionAmount = Number((o.totalPrice * (adminRate / 100)).toFixed(2));
                }
              });

              const totalSalesVolume = dealerCompletedOrders.reduce((sum: number, o: any) => sum + o.totalPrice, 0);
              const totalCommission = dealerCompletedOrders.reduce((sum: number, o: any) => sum + o.commissionAmount, 0);

              d.salesVolume = Number(totalSalesVolume.toFixed(2));
              d.commissionEarned = Number(totalCommission.toFixed(2));
            });

            payload = { newOrderId: newId };
            telegramMessage = [
              'Yeni sipariş alındı',
              `Sipariş: ${newId}`,
              `Müşteri: ${newOrder.customerName}`,
              `Tutar: ${Number(newOrder.totalPrice).toFixed(2)} TL`,
              `Ürün adedi: ${(newOrder.items || []).reduce((sum: number, item: any) => sum + (item.quantity || 0), 0)}`
            ].join('\n');
            break;
          }

          case "saveMembers": {
            db.members = Array.isArray(data.members) ? data.members : [];
            break;
          }

          case "saveProduct": {
            const { product } = data;
            if (!db.products) db.products = [];
            const index = db.products.findIndex((p: any) => p.id === product.id);
            if (index !== -1) {
              db.products[index] = product;
            } else {
              db.products.push(product);
            }
            break;
          }

          case "saveProductsList": {
            const { productsList } = data;
            db.products = productsList;
            break;
          }

          case "deleteProduct": {
            const { id } = data;
            if (db.products) {
              db.products = db.products.filter((p: any) => p.id !== id);
            }
            break;
          }

          case "saveDealer": {
            const { dealer } = data;
            if (!db.dealers) db.dealers = [];
            const index = db.dealers.findIndex((d: any) => d.id === dealer.id);
            if (index !== -1) {
              db.dealers[index] = dealer;
            } else {
              db.dealers.push(dealer);
            }
            break;
          }

          case "deleteDealer": {
            const { id } = data;
            if (db.dealers) {
              db.dealers = db.dealers.filter((d: any) => d.id !== id);
            }
            if (db.orders) {
              db.orders = db.orders.map((o: any) =>
                o.dealerId === id ? { ...o, dealerName: "Silinmiş Bayi (Destek İsteyin)" } : o
              );
            }
            break;
          }

          case "createCommissionRequest": {
            const { request } = data;
            const newId = `talep-${Date.now().toString().slice(-4)}`;
            const newRequest = {
              ...request,
              id: newId,
              status: "pending",
              date: new Date().toISOString()
            };
            if (!db.commissionRequests) db.commissionRequests = [];
            db.commissionRequests.push(newRequest);
            break;
          }

          case "approveCommissionRequest": {
            const { requestId } = data;
            const requests = db.commissionRequests || [];
            const reqIndex = requests.findIndex((r: any) => r.id === requestId);
            if (reqIndex !== -1 && requests[reqIndex].status === "pending") {
              const req = requests[reqIndex];
              req.status = "approved";

              const currentPool = db.storeSettings.adminPoolBalance || 250000;
              db.storeSettings.adminPoolBalance = Number((currentPool - req.amount).toFixed(2));

              const dIndex = (db.dealers || []).findIndex((d: any) => d.id === req.dealerId);
              if (dIndex !== -1) {
                const d = db.dealers[dIndex];
                d.commissionEarned = Number((d.commissionEarned - req.amount).toFixed(2));
              }
            }
            break;
          }

          case "rejectCommissionRequest": {
            const { requestId } = data;
            const requests = db.commissionRequests || [];
            const reqIndex = requests.findIndex((r: any) => r.id === requestId);
            if (reqIndex !== -1 && requests[reqIndex].status === "pending") {
              requests[reqIndex].status = "rejected";
            }
            break;
          }

          case "payCommissionDirectly": {
            const { dealerId, amount } = data;
            const dealer = (db.dealers || []).find((d: any) => d.id === dealerId);
            if (dealer) {
              dealer.commissionEarned = Number((dealer.commissionEarned - amount).toFixed(2));

              const currentPool = db.storeSettings.adminPoolBalance || 250000;
              db.storeSettings.adminPoolBalance = Number((currentPool - amount).toFixed(2));

              const newId = `talep-${Date.now().toString().slice(-4)}`;
              const newRequest = {
                id: newId,
                dealerId: dealer.id,
                dealerName: dealer.name,
                amount,
                bankName: dealer.bankName || "Ziraat Bankası",
                accountHolder: dealer.accountHolder || dealer.owner,
                iban: dealer.iban || "TR560000000000000000000000",
                status: "approved",
                date: new Date().toISOString()
              };
              if (!db.commissionRequests) db.commissionRequests = [];
              db.commissionRequests.push(newRequest);
            }
            break;
          }

          case "saveStoreSettings": {
            const { storeSettings } = data;
            db.storeSettings = storeSettings;
            // Force recalculate existing central order commissions under the new rate to ensure consistent accounting
            if (db.orders && Array.isArray(db.orders)) {
              const rate = storeSettings.commissionRate / 100;
              db.orders = db.orders.map((o: any) => {
                if (o.status === "completed" && !o.isFromDealerPage) {
                  return {
                    ...o,
                    commissionAmount: Number((o.totalPrice * rate).toFixed(2))
                  };
                }
                return o;
              });
            }
            break;
          }

          case "saveOrdersList": {
            const { ordersList } = data;
            db.orders = ordersList;

            // Recalculate ciro/commissions for all dealers for 100% data integrity
            const settings = db.storeSettings;
            (db.dealers || []).forEach((d: any) => {
              const dActiveRate = d.commissionRate !== undefined ? d.commissionRate : settings.commissionRate;
              const dRateFraction = dActiveRate / 100;

              const dealerCompletedOrders = (db.orders || []).filter(
                (o: any) => o.dealerId === d.id && o.status === 'completed' && o.adminApproved !== false
              );

              dealerCompletedOrders.forEach((o: any) => {
                if (o.isFromDealerPage) {
                  const adminPrivateRate = d.privateCommissionRate !== undefined
                    ? d.privateCommissionRate
                    : (settings.defaultPrivateCommissionRate !== undefined ? settings.defaultPrivateCommissionRate : 5.0);

                  o.adminCommissionAmount = Number((o.totalPrice * (adminPrivateRate / 100)).toFixed(2));
                  o.commissionAmount = Number((o.totalPrice - o.adminCommissionAmount).toFixed(2));
                } else {
                  o.commissionAmount = Number((o.totalPrice * dRateFraction).toFixed(2));

                  const sector = o.selectedSector || d.sector || 'Kırtasiye';
                  const adminCommissions = settings.sectorAdminCommissions || {};
                  const adminRate = d.adminSectorCommissionRate !== undefined
                    ? d.adminSectorCommissionRate
                    : (adminCommissions[sector] !== undefined ? adminCommissions[sector] : 3.0);
                  o.adminCommissionAmount = Number((o.totalPrice * (adminRate / 100)).toFixed(2));
                }
              });

              const totalSalesVolume = dealerCompletedOrders.reduce((sum: number, o: any) => sum + o.totalPrice, 0);
              const totalCommission = dealerCompletedOrders.reduce((sum: number, o: any) => sum + o.commissionAmount, 0);

              d.salesVolume = Number(totalSalesVolume.toFixed(2));
              d.commissionEarned = Number(totalCommission.toFixed(2));
            });
            break;
          }

          case "markOrderDownloaded": {
            const { orderId } = data;
            if (db.orders && Array.isArray(db.orders)) {
              db.orders = db.orders.map((o: any) => {
                if (o.id === orderId) {
                  return { ...o, customerDownloaded: true };
                }
                return o;
              });
            }
            break;
          }

          default:
            throw new Error(`Unsupported transaction action: ${action}`);
        }

        // Persist changes to disk and return
        saveDb();
        const telegramSettings = db.storeSettings || {};
        const shouldNotifyOrder = action === 'createOrder' && telegramSettings.telegramNotificationsEnabled === true && telegramSettings.telegramOrderNotifications !== false;
        const shouldNotifyActivity = action !== 'createOrder' && telegramSettings.telegramNotificationsEnabled === true && telegramSettings.telegramActivityNotifications === true;
        try {
          if ((shouldNotifyOrder || shouldNotifyActivity) && telegramMessage) {
            await sendTelegramMessage(telegramSettings.telegramChatId || '', telegramMessage);
          } else if (shouldNotifyActivity) {
            const activityLabels: Record<string, string> = {
              saveProduct: 'Ürün kaydedildi',
              saveProductsList: 'Ürün listesi güncellendi',
              deleteProduct: 'Ürün silindi',
              saveDealer: 'Bayi kaydedildi',
              deleteDealer: 'Bayi silindi',
              saveStoreSettings: 'Mağaza ayarları güncellendi',
              saveOrdersList: 'Sipariş listesi güncellendi',
              markOrderDownloaded: 'Sipariş belgesi indirildi',
              createCommissionRequest: 'Komisyon talebi oluşturuldu',
              approveCommissionRequest: 'Komisyon talebi onaylandı',
              rejectCommissionRequest: 'Komisyon talebi reddedildi',
              payCommissionDirectly: 'Doğrudan komisyon ödemesi yapıldı'
            };
            await sendTelegramMessage(telegramSettings.telegramChatId || '', `Yönetici aktivitesi\n${activityLabels[action] || action}`);
          }
        } catch (telegramError) {
          console.error('Telegram notification failed:', telegramError);
        }
        return { dbState: db, ...payload };
      });

      return res.json({ status: "ok", ...result });
    } catch (e: any) {
      console.error(`Transaction failed for action: ${action}`, e);
      return res.status(500).json({ error: e.message || "Transaction failed" });
    }
  });

  // Serve static assets in production or use Vite middleware in development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
