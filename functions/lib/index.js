"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteDealer = exports.optimizeProductImage = exports.migrateDealers = exports.submitDealerApplication = exports.restoreAdminProfile = void 0;
const app_1 = require("firebase-admin/app");
const auth_1 = require("firebase-admin/auth");
const storage_1 = require("firebase-admin/storage");
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
const storage_2 = require("firebase-functions/v2/storage");
const sharp_1 = __importDefault(require("sharp"));
if ((0, app_1.getApps)().length === 0)
    (0, app_1.initializeApp)();
const auth = (0, auth_1.getAuth)();
const db = (0, firestore_1.getFirestore)();
const storage = (0, storage_1.getStorage)();
const isAdmin = async (uid) => {
    const profile = await db.collection('users').doc(uid).get();
    return profile.exists && profile.data()?.role === 'admin';
};
const reserveDealerId = async () => {
    const counterRef = db.collection('system').doc('dealerCounter');
    return db.runTransaction(async (transaction) => {
        const counterSnapshot = await transaction.get(counterRef);
        let nextNumber = (counterSnapshot.data()?.lastNumber || 0) + 1;
        let dealerId = String(nextNumber).padStart(6, '0');
        while ((await transaction.get(db.collection('dealers').doc(dealerId))).exists) {
            nextNumber += 1;
            dealerId = String(nextNumber).padStart(6, '0');
        }
        if (nextNumber > 999999) {
            throw new https_1.HttpsError('resource-exhausted', 'Bayi ID kapasitesi doldu.');
        }
        transaction.set(counterRef, { lastNumber: nextNumber }, { merge: true });
        return dealerId;
    });
};
exports.restoreAdminProfile = (0, https_1.onCall)(async (request) => {
    const callerUid = request.auth?.uid;
    const callerEmail = request.auth?.token.email?.trim().toLowerCase();
    if (!callerUid || callerEmail !== 'bugurcagroup@gmail.com') {
        throw new https_1.HttpsError('permission-denied', 'Bu hesap yönetici olarak kurtarılamaz.');
    }
    await db.collection('users').doc(callerUid).set({
        uid: callerUid,
        email: callerEmail,
        role: 'admin',
        displayName: 'Sistem Yöneticisi',
        createdAt: new Date().toISOString(),
    }, { merge: true });
    return { uid: callerUid, email: callerEmail, role: 'admin' };
});
exports.submitDealerApplication = (0, https_1.onCall)(async (request) => {
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
        throw new https_1.HttpsError('invalid-argument', 'Başvuru bilgileri ve en az 6 karakterli şifre gereklidir.');
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
    }
    catch (error) {
        if (authUid) {
            try {
                await auth.deleteUser(authUid);
            }
            catch {
                // Keep the original failure as the client-facing error.
            }
        }
        const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
        if (code === 'auth/email-already-exists') {
            throw new https_1.HttpsError('already-exists', 'Bu e-posta adresiyle zaten bir bayi hesabı bulunuyor.');
        }
        throw new https_1.HttpsError('internal', 'Bayi başvurusu kaydedilemedi.');
    }
});
const migrateDealerRecords = async () => {
    const migrationRef = db.collection('system').doc('migrations');
    const migrationSnapshot = await migrationRef.get();
    if (migrationSnapshot.data()?.dealersV1 === true)
        return 0;
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
            createdAt: dealer.createdAt || new Date().toISOString(),
        };
        return [
            { type: 'set', ref: db.collection('dealer_public').doc(dealerDocument.id), data: publicData },
            { type: 'update', ref: dealerDocument.ref, data: { password: firestore_1.FieldValue.delete() } },
        ];
    });
    for (let index = 0; index < operations.length; index += 400) {
        const batch = db.batch();
        operations.slice(index, index + 400).forEach(operation => {
            if (operation.type === 'set')
                batch.set(operation.ref, operation.data, { merge: true });
            else
                batch.update(operation.ref, operation.data);
        });
        await batch.commit();
    }
    await migrationRef.set({ dealersV1: true, completedAt: new Date().toISOString() }, { merge: true });
    return dealers.size;
};
exports.migrateDealers = (0, https_1.onCall)(async (request) => {
    const callerUid = request.auth?.uid;
    if (!callerUid || !(await isAdmin(callerUid))) {
        throw new https_1.HttpsError('permission-denied', 'Bu işlem yalnızca yönetici hesabıyla yapılabilir.');
    }
    return { migrated: await migrateDealerRecords() };
});
exports.optimizeProductImage = (0, storage_2.onObjectFinalized)({
    region: 'europe-west1',
    bucket: 'bugurcagroup-d4c47.firebasestorage.app',
}, async (event) => {
    const object = event.data;
    const objectName = object.name || '';
    const contentType = object.contentType || '';
    const size = Number(object.size || 0);
    if (!objectName.startsWith('products/') || !contentType.startsWith('image/'))
        return;
    if (contentType === 'image/webp' && (size <= 500 * 1024 || object.metadata?.optimized === 'true'))
        return;
    const bucket = (0, storage_1.getStorage)().bucket(object.bucket);
    const source = bucket.file(objectName);
    const [sourceBuffer] = await source.download();
    const optimizedBuffer = await (0, sharp_1.default)(sourceBuffer)
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
    if (targetName !== objectName)
        await source.delete();
});
exports.deleteDealer = (0, https_1.onCall)(async (request) => {
    const callerUid = request.auth?.uid;
    if (!callerUid || !(await isAdmin(callerUid))) {
        throw new https_1.HttpsError('permission-denied', 'Bu işlem yalnızca yönetici hesabıyla yapılabilir.');
    }
    const dealerId = typeof request.data?.dealerId === 'string' ? request.data.dealerId.trim() : '';
    if (!dealerId) {
        throw new https_1.HttpsError('invalid-argument', 'Geçerli bir bayi ID gereklidir.');
    }
    const dealerRef = db.collection('dealers').doc(dealerId);
    const dealerSnapshot = await dealerRef.get();
    if (!dealerSnapshot.exists) {
        throw new https_1.HttpsError('not-found', 'Bayi kaydı bulunamadı.');
    }
    const dealer = dealerSnapshot.data() || {};
    const profileSnapshot = await db.collection('users').where('dealerId', '==', dealerId).get();
    const profileIds = new Set([dealerId]);
    profileSnapshot.forEach(profile => profileIds.add(profile.id));
    if (typeof dealer.userId === 'string' && dealer.userId.trim())
        profileIds.add(dealer.userId.trim());
    const profileDocuments = await Promise.all(Array.from(profileIds).map(profileId => db.collection('users').doc(profileId).get()));
    if (profileDocuments.some(profile => profile.exists && profile.data()?.role === 'admin')) {
        throw new https_1.HttpsError('failed-precondition', 'Yönetici hesabı bayi kaydıyla ilişkilendirilemez ve silinemez.');
    }
    let authUid = typeof dealer.userId === 'string' && dealer.userId.trim() ? dealer.userId.trim() : '';
    if (!authUid && typeof dealer.email === 'string' && dealer.email.trim()) {
        try {
            authUid = (await auth.getUserByEmail(dealer.email.trim().toLowerCase())).uid;
        }
        catch (error) {
            if (error.code !== 'auth/user-not-found') {
                throw new https_1.HttpsError('internal', 'Bayi Auth hesabı doğrulanamadı. Firestore kayıtları korunmuştur.');
            }
        }
    }
    if (authUid === callerUid) {
        throw new https_1.HttpsError('failed-precondition', 'Oturum açmış yönetici hesabı silinemez.');
    }
    if (authUid) {
        try {
            const authRecord = await auth.getUser(authUid);
            if (authRecord.customClaims?.role === 'admin' || authRecord.email?.trim().toLowerCase() === 'bugurcagroup@gmail.com') {
                throw new https_1.HttpsError('failed-precondition', 'Yönetici Authentication hesabı silinemez.');
            }
            await auth.deleteUser(authUid);
        }
        catch (error) {
            if (error.code === 'failed-precondition')
                throw error;
            if (error.code !== 'auth/user-not-found') {
                throw new https_1.HttpsError('internal', 'Firebase Authentication hesabı silinemedi. Firestore kayıtları korunmuştur.');
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
    const orderIdsToDelete = new Set();
    orderSnapshot.docs.forEach(orderDocument => {
        const order = orderDocument.data();
        const items = Array.isArray(order.items) ? order.items : [];
        const includesDealer = order.dealerId === dealerId || items.some(item => (item && typeof item === 'object' && (item.dealerId === dealerId
            || (typeof item.productId === 'string' && productIds.has(item.productId)))));
        if (includesDealer)
            orderIdsToDelete.add(orderDocument.id);
    });
    orderSnapshot.docs.forEach(orderDocument => {
        const order = orderDocument.data();
        if (typeof order.masterOrderId === 'string' && orderIdsToDelete.has(order.masterOrderId))
            orderIdsToDelete.add(orderDocument.id);
        if (Array.isArray(order.subOrderIds) && order.subOrderIds.some((id) => typeof id === 'string' && orderIdsToDelete.has(id))) {
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
    }
    catch {
        throw new https_1.HttpsError('internal', 'Bayi dosyaları silinemedi. Firestore kayıtları silindi, Storage temizliği tamamlanamadı.');
    }
    return {
        deleted: true,
        dealerId,
        authUid: authUid || null,
        deletedProducts: productSnapshot.size,
        deletedOrders: orderIdsToDelete.size,
    };
});
