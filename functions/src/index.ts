import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onObjectFinalized } from 'firebase-functions/v2/storage';
import sharp from 'sharp';

if (getApps().length === 0) initializeApp();

const auth = getAuth();
const db = getFirestore();
const storage = getStorage();

const isAdmin = async (uid: string) => {
  const profile = await db.collection('users').doc(uid).get();
  return profile.exists && profile.data()?.role === 'admin';
};

const reserveDealerId = async () => {
  const counterRef = db.collection('system').doc('dealerCounter');
  return db.runTransaction(async transaction => {
    const counterSnapshot = await transaction.get(counterRef);
    let nextNumber = (counterSnapshot.data()?.lastNumber || 0) + 1;
    let dealerId = String(nextNumber).padStart(6, '0');
    while ((await transaction.get(db.collection('dealers').doc(dealerId))).exists) {
      nextNumber += 1;
      dealerId = String(nextNumber).padStart(6, '0');
    }
    if (nextNumber > 999999) {
      throw new HttpsError('resource-exhausted', 'Bayi ID kapasitesi doldu.');
    }
    transaction.set(counterRef, { lastNumber: nextNumber }, { merge: true });
    return dealerId;
  });
};

export const restoreAdminProfile = onCall(async request => {
  const callerUid = request.auth?.uid;
  const callerEmail = request.auth?.token.email?.trim().toLowerCase();
  if (!callerUid || callerEmail !== 'bugurcagroup@gmail.com') {
    throw new HttpsError('permission-denied', 'Bu hesap yönetici olarak kurtarılamaz.');
  }

  await db.collection('users').doc(callerUid).set({
    uid: callerUid,
    email: callerEmail,
    role: 'admin',
    displayName: 'Sistem Yöneticisi',
    createdAt: new Date().toISOString(),
  }, { merge: true });

  return { uid: callerUid, email: callerEmail, role: 'admin' as const };
});

const roundCurrency = (value: number) => Number(value.toFixed(2));

const getCentralOrderTotal = (order: Record<string, unknown>, dealerProductIds: Set<string>) => {
  const items = Array.isArray(order.items) ? order.items : [];
  return items.reduce((total, item) => {
    if (!item || typeof item !== 'object') return total;
    const orderItem = item as Record<string, unknown>;
    const dealerId = typeof orderItem.dealerId === 'string' ? orderItem.dealerId.trim() : '';
    const productId = typeof orderItem.productId === 'string' ? orderItem.productId : '';
    const isDealerProduct = orderItem.source === 'dealer' || Boolean(dealerId) || dealerProductIds.has(productId);
    if (isDealerProduct) return total;
    const price = Math.max(0, Number(orderItem.price) || 0);
    const quantity = Math.max(0, Number(orderItem.quantity) || 0);
    return total + price * quantity;
  }, 0);
};

const syncDealerFinancials = async (dealerId: string) => {
  const [dealerSnapshot, orderSnapshot, productSnapshot, settingsSnapshot] = await Promise.all([
    db.collection('dealers').doc(dealerId).get(),
    db.collection('orders').where('dealerId', '==', dealerId).get(),
    db.collection('products').get(),
    db.collection('settings').doc('general').get(),
  ]);
  const dealer = dealerSnapshot.data() || {};
  const settings = settingsSnapshot.data() || {};
  const dealerProductIds = new Set(
    productSnapshot.docs
      .filter(product => product.data().dealerId === dealerId)
      .map(product => product.id),
  );
  const dealerRate = Math.max(0, Number(dealer.commissionRate ?? settings.commissionRate) || 0);
  const totals = orderSnapshot.docs.reduce((summary, orderDocument) => {
    const order = orderDocument.data();
    if (order.orderRole === 'master' || order.status !== 'completed' || order.adminApproved === false || order.commissionVoided === true) {
      return summary;
    }
    const totalPrice = Math.max(0, Number(order.totalPrice) || 0);
    const centralTotal = getCentralOrderTotal(order, dealerProductIds);
    const commission = roundCurrency(centralTotal * dealerRate / 100);
    return {
      salesVolume: summary.salesVolume + totalPrice,
      commissionEarned: summary.commissionEarned + commission,
    };
  }, { salesVolume: 0, commissionEarned: 0 });

  await db.collection('dealers').doc(dealerId).set({
    salesVolume: roundCurrency(totals.salesVolume),
    commissionEarned: roundCurrency(totals.commissionEarned),
    updatedAt: new Date().toISOString(),
  }, { merge: true });
};

export const syncDealerCommission = onDocumentWritten('orders/{orderId}', async event => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  const dealerIds = new Set(
    [before?.dealerId, after?.dealerId]
      .filter((dealerId): dealerId is string => typeof dealerId === 'string' && dealerId !== 'master' && dealerId !== 'central'),
  );

  await Promise.all(Array.from(dealerIds).map(syncDealerFinancials));
});

export const syncDealerFinancialsOnRateChange = onDocumentWritten('dealers/{dealerId}', async event => {
  const before = event.data?.before.data() || {};
  const after = event.data?.after.data() || {};
  const rateFields = ['commissionRate', 'privateCommissionRate', 'adminSectorCommissionRate'];
  if (!rateFields.some(field => before[field] !== after[field])) return;

  await syncDealerFinancials(event.params.dealerId);
});

export const syncAllDealerFinancialsOnSettingsChange = onDocumentWritten('settings/{settingsId}', async event => {
  if (event.params.settingsId !== 'general') return;

  const dealerIds = (await db.collection('dealers').get()).docs.map(dealer => dealer.id);
  await Promise.all(dealerIds.map(syncDealerFinancials));
});

export const recalculateDealerFinancials = onCall(async request => {
  const callerUid = request.auth?.uid;
  if (!callerUid || !(await isAdmin(callerUid))) {
    throw new HttpsError('permission-denied', 'Bu işlem yalnızca yönetici hesabıyla yapılabilir.');
  }

  const requestedDealerId = typeof request.data?.dealerId === 'string' ? request.data.dealerId.trim() : '';
  const dealerIds = requestedDealerId
    ? [requestedDealerId]
    : (await db.collection('dealers').get()).docs.map(dealer => dealer.id);
  await Promise.all(dealerIds.map(syncDealerFinancials));
  return { recalculated: dealerIds.length };
});

export const submitDealerApplication = onCall(async request => {
  const data = request.data || {};
  const name = typeof data.name === 'string' ? data.name.trim() : '';
  const owner = typeof data.owner === 'string' ? data.owner.trim() : '';
  const sector = typeof data.sector === 'string' ? data.sector.trim() : '';
  const city = typeof data.city === 'string' ? data.city.trim() : '';
  const district = typeof data.district === 'string' ? data.district.trim() : '';
  const address = typeof data.address === 'string' ? data.address.trim() : '';
  const phone = typeof data.phone === 'string' ? data.phone.trim() : '';
  const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
  const password = typeof data.password === 'string' ? data.password : '';

  if (!name || !owner || !city || !district || !address || !phone || !email || password.length < 6) {
    throw new HttpsError('invalid-argument', 'Başvuru bilgileri ve en az 6 karakterli şifre gereklidir.');
  }

  const existingApplicationSnapshot = await db.collection('dealer_applications')
    .where('email', '==', email)
    .limit(1)
    .get();
  const existingApplication = existingApplicationSnapshot.docs[0];
  if (existingApplication) {
    const existingData = existingApplication.data();
    if (existingData.status === 'pending' || existingData.status === 'approved') {
      return {
        applicationId: existingApplication.id,
        dealerId: typeof existingData.dealerId === 'string' ? existingData.dealerId : '',
        authUid: typeof existingData.authUid === 'string' ? existingData.authUid : '',
      };
    }
  }

  const applicationRef = db.collection('dealer_applications').doc();
  const dealerId = await reserveDealerId();
  const createdAt = new Date().toISOString();
  let authUid = '';
  try {
    const authRecord = await auth.createUser({ email, password, displayName: owner || name });
    authUid = authRecord.uid;
    const batch = db.batch();
    batch.set(applicationRef, {
      name,
      owner,
      sector,
      city,
      district,
      address,
      phone,
      email,
      status: 'pending',
      dealerId,
      authUid,
      createdAt,
    });
    batch.set(db.collection('users').doc(authUid), {
      uid: authUid,
      role: 'bayi',
      dealerId,
      displayName: owner || name,
      companyName: name,
      email,
      phone,
      createdAt,
    });
    await batch.commit();
    return { applicationId: applicationRef.id, dealerId, authUid };
  } catch (error) {
    if (authUid) {
      try {
        await auth.deleteUser(authUid);
      } catch {
        // Keep the original failure as the client-facing error.
      }
    }
    const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
    if (code === 'auth/email-already-exists') {
      const existingApplicationSnapshot = await db.collection('dealer_applications')
        .where('email', '==', email)
        .limit(1)
        .get();
      const existingApplication = existingApplicationSnapshot.docs[0];
      const existingData = existingApplication?.data();
      if (existingApplication && (existingData?.status === 'pending' || existingData?.status === 'approved')) {
        return {
          applicationId: existingApplication.id,
          dealerId: typeof existingData.dealerId === 'string' ? existingData.dealerId : '',
          authUid: typeof existingData.authUid === 'string' ? existingData.authUid : '',
        };
      }
      throw new HttpsError('already-exists', 'Bu e-posta adresiyle zaten bir bayi hesabı bulunuyor.');
    }
    throw new HttpsError('internal', 'Bayi başvurusu kaydedilemedi.');
  }
});

const migrateDealerRecords = async () => {
  const migrationRef = db.collection('system').doc('migrations');
  const migrationSnapshot = await migrationRef.get();
  if (migrationSnapshot.data()?.dealersV2 === true) return 0;

  const dealers = await db.collection('dealers').get();
  const operations = dealers.docs.flatMap(dealerDocument => {
    const dealer = dealerDocument.data();
    const publicData = {
      name: typeof dealer.name === 'string' ? dealer.name : '',
      owner: typeof dealer.owner === 'string' ? dealer.owner : '',
      city: typeof dealer.city === 'string' ? dealer.city : '',
      district: typeof dealer.district === 'string' ? dealer.district : '',
      address: typeof dealer.address === 'string' ? dealer.address : '',
      phone: typeof dealer.phone === 'string' ? dealer.phone : '',
      email: typeof dealer.email === 'string' ? dealer.email.trim().toLowerCase() : '',
      status: dealer.status === 'active' || dealer.status === 'suspended' ? dealer.status : 'pending',
      sector: typeof dealer.sector === 'string' ? dealer.sector : '',
      ...(typeof dealer.commissionRate === 'number' ? { commissionRate: dealer.commissionRate } : {}),
      ...(typeof dealer.privateCommissionRate === 'number' ? { privateCommissionRate: dealer.privateCommissionRate } : {}),
      createdAt: dealer.createdAt || new Date().toISOString(),
    };
    return [
      { type: 'set' as const, ref: db.collection('dealer_public').doc(dealerDocument.id), data: publicData },
      { type: 'update' as const, ref: dealerDocument.ref, data: { password: FieldValue.delete() } },
    ];
  });

  for (let index = 0; index < operations.length; index += 400) {
    const batch = db.batch();
    operations.slice(index, index + 400).forEach(operation => {
      if (operation.type === 'set') batch.set(operation.ref, operation.data, { merge: true });
      else batch.update(operation.ref, operation.data);
    });
    await batch.commit();
  }

  await migrationRef.set({ dealersV2: true, completedAt: new Date().toISOString() }, { merge: true });
  return dealers.size;
};

export const migrateDealers = onCall(async request => {
  const callerUid = request.auth?.uid;
  if (!callerUid || !(await isAdmin(callerUid))) {
    throw new HttpsError('permission-denied', 'Bu işlem yalnızca yönetici hesabıyla yapılabilir.');
  }
  return { migrated: await migrateDealerRecords() };
});

export const optimizeProductImage = onObjectFinalized({
  region: 'europe-west1',
  bucket: 'bugurcagroup-d4c47.firebasestorage.app',
}, async event => {
  const object = event.data;
  const objectName = object.name || '';
  const contentType = object.contentType || '';
  const size = Number(object.size || 0);
  if (!objectName.startsWith('products/') || !contentType.startsWith('image/')) return;
  if (contentType === 'image/webp' && (size <= 500 * 1024 || object.metadata?.optimized === 'true')) return;

  const bucket = getStorage().bucket(object.bucket);
  const source = bucket.file(objectName);
  const [sourceBuffer] = await source.download();
  const optimizedBuffer = await sharp(sourceBuffer)
    .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
  const targetName = objectName.replace(/\.[^/.]+$/, '') + '.webp';
  const target = bucket.file(targetName);
  await target.save(optimizedBuffer, {
    resumable: false,
    metadata: {
      contentType: 'image/webp',
      cacheControl: 'public,max-age=31536000,immutable',
      metadata: { optimized: 'true' },
    },
  });
  if (targetName !== objectName) await source.delete();
});

export const deleteDealer = onCall(async request => {
  const callerUid = request.auth?.uid;
  if (!callerUid || !(await isAdmin(callerUid))) {
    throw new HttpsError('permission-denied', 'Bu işlem yalnızca yönetici hesabıyla yapılabilir.');
  }

  const dealerId = typeof request.data?.dealerId === 'string' ? request.data.dealerId.trim() : '';
  if (!dealerId) {
    throw new HttpsError('invalid-argument', 'Geçerli bir bayi ID gereklidir.');
  }

  const dealerRef = db.collection('dealers').doc(dealerId);
  const dealerSnapshot = await dealerRef.get();
  if (!dealerSnapshot.exists) {
    throw new HttpsError('not-found', 'Bayi kaydı bulunamadı.');
  }

  const dealer = dealerSnapshot.data() || {};
  const profileSnapshot = await db.collection('users').where('dealerId', '==', dealerId).get();
  const profileIds = new Set<string>([dealerId]);
  profileSnapshot.forEach(profile => profileIds.add(profile.id));
  if (typeof dealer.userId === 'string' && dealer.userId.trim()) profileIds.add(dealer.userId.trim());

  const profileDocuments = await Promise.all(Array.from(profileIds).map(profileId => db.collection('users').doc(profileId).get()));
  if (profileDocuments.some(profile => profile.exists && profile.data()?.role === 'admin')) {
    throw new HttpsError('failed-precondition', 'Yönetici hesabı bayi kaydıyla ilişkilendirilemez ve silinemez.');
  }

  let authUid = typeof dealer.userId === 'string' && dealer.userId.trim() ? dealer.userId.trim() : '';
  if (!authUid && typeof dealer.email === 'string' && dealer.email.trim()) {
    try {
      authUid = (await auth.getUserByEmail(dealer.email.trim().toLowerCase())).uid;
    } catch (error) {
      if ((error as { code?: string }).code !== 'auth/user-not-found') {
        throw new HttpsError('internal', 'Bayi Auth hesabı doğrulanamadı. Firestore kayıtları korunmuştur.');
      }
    }
  }

  if (authUid === callerUid) {
    throw new HttpsError('failed-precondition', 'Oturum açmış yönetici hesabı silinemez.');
  }

  if (authUid) {
    try {
      const authRecord = await auth.getUser(authUid);
      if (authRecord.customClaims?.role === 'admin' || authRecord.email?.trim().toLowerCase() === 'bugurcagroup@gmail.com') {
        throw new HttpsError('failed-precondition', 'Yönetici Authentication hesabı silinemez.');
      }
      await auth.deleteUser(authUid);
    } catch (error) {
      if ((error as { code?: string }).code === 'failed-precondition') throw error;
      if ((error as { code?: string }).code !== 'auth/user-not-found') {
        throw new HttpsError('internal', 'Firebase Authentication hesabı silinemedi. Firestore kayıtları korunmuştur.');
      }
    }
  }

  const [productSnapshot, orderSnapshot, commissionRequestSnapshot, transactionSnapshot, applicationSnapshot] = await Promise.all([
    db.collection('products').where('dealerId', '==', dealerId).get(),
    db.collection('orders').get(),
    db.collection('commission_requests').where('dealerId', '==', dealerId).get(),
    db.collection('transactions').where('dealerId', '==', dealerId).get(),
    db.collection('dealer_applications').where('dealerId', '==', dealerId).get(),
  ]);

  const productIds = new Set(productSnapshot.docs.map(product => product.id));
  const orderIdsToDelete = new Set<string>();
  orderSnapshot.docs.forEach(orderDocument => {
    const order = orderDocument.data();
    const items = Array.isArray(order.items) ? order.items : [];
    const includesDealer = order.dealerId === dealerId || items.some(item => (
      item && typeof item === 'object' && (
        (item as { dealerId?: unknown }).dealerId === dealerId
        || (typeof (item as { productId?: unknown }).productId === 'string' && productIds.has((item as { productId: string }).productId))
      )
    ));
    if (includesDealer) orderIdsToDelete.add(orderDocument.id);
  });

  orderSnapshot.docs.forEach(orderDocument => {
    const order = orderDocument.data();
    if (typeof order.masterOrderId === 'string' && orderIdsToDelete.has(order.masterOrderId)) orderIdsToDelete.add(orderDocument.id);
    if (Array.isArray(order.subOrderIds) && order.subOrderIds.some((id: unknown) => typeof id === 'string' && orderIdsToDelete.has(id))) {
      orderIdsToDelete.add(orderDocument.id);
    }
  });

  const refsToDelete = [
    dealerRef,
    db.collection('dealer_public').doc(dealerId),
    ...Array.from(profileIds, profileId => db.collection('users').doc(profileId)),
    ...productSnapshot.docs.map(product => product.ref),
    ...Array.from(orderIdsToDelete, orderId => db.collection('orders').doc(orderId)),
    ...commissionRequestSnapshot.docs.map(item => item.ref),
    ...transactionSnapshot.docs.map(item => item.ref),
    ...applicationSnapshot.docs.map(item => item.ref),
  ];

  for (let index = 0; index < refsToDelete.length; index += 400) {
    const batch = db.batch();
    refsToDelete.slice(index, index + 400).forEach(reference => batch.delete(reference));
    await batch.commit();
  }

  try {
    const [files] = await storage.bucket().getFiles({ prefix: `products/${dealerId}/` });
    await Promise.all(files.map(file => file.delete()));
  } catch {
    throw new HttpsError('internal', 'Bayi dosyaları silinemedi. Firestore kayıtları silindi, Storage temizliği tamamlanamadı.');
  }

  return {
    deleted: true,
    dealerId,
    authUid: authUid || null,
    deletedProducts: productSnapshot.size,
    deletedOrders: orderIdsToDelete.size,
  };
});

export * from './orderMail';
