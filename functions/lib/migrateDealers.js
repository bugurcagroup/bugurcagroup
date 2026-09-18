"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
if ((0, app_1.getApps)().length === 0) {
    (0, app_1.initializeApp)({
        projectId: process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || 'bugurcagroup-d4c47',
    });
}
const db = (0, firestore_1.getFirestore)();
const isDryRun = process.env.DRY_RUN === 'true';
const asString = (value, fallback = '') => typeof value === 'string' ? value : fallback;
const migrateDealers = async () => {
    const snapshot = await db.collection('dealers').get();
    let batch = db.batch();
    let batchSize = 0;
    let migrated = 0;
    const commitBatch = async () => {
        if (batchSize === 0 || isDryRun)
            return;
        await batch.commit();
        batch = db.batch();
        batchSize = 0;
    };
    for (const dealerDocument of snapshot.docs) {
        const dealer = dealerDocument.data();
        const publicData = {
            name: asString(dealer.name),
            owner: asString(dealer.owner),
            city: asString(dealer.city),
            district: asString(dealer.district),
            address: asString(dealer.address),
            phone: asString(dealer.phone),
            email: asString(dealer.email).trim().toLowerCase(),
            status: dealer.status === 'active' || dealer.status === 'suspended' ? dealer.status : 'pending',
            sector: asString(dealer.sector),
            createdAt: dealer.createdAt || new Date().toISOString(),
        };
        batch.set(db.collection('dealer_public').doc(dealerDocument.id), publicData, { merge: true });
        batch.update(dealerDocument.ref, { password: firestore_1.FieldValue.delete() });
        batchSize += 2;
        migrated += 1;
        if (batchSize >= 400)
            await commitBatch();
    }
    await commitBatch();
    console.log(`${migrated} bayi migration kapsamına alındı${isDryRun ? ' (DRY_RUN, yazma yapılmadı)' : ''}.`);
};
migrateDealers().catch(error => {
    console.error('Bayi migration başarısız:', error);
    process.exitCode = 1;
});
