import { getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

if (getApps().length === 0) {
  initializeApp({
    projectId: process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || 'bugurcagroup-d4c47',
  });
}

const db = getFirestore();
const isDryRun = process.env.DRY_RUN === 'true';

const asString = (value: unknown, fallback = '') => typeof value === 'string' ? value : fallback;

const migrateDealers = async () => {
  const snapshot = await db.collection('dealers').get();
  let batch = db.batch();
  let batchSize = 0;
  let migrated = 0;

  const commitBatch = async () => {
    if (batchSize === 0 || isDryRun) return;
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
    batch.update(dealerDocument.ref, { password: FieldValue.delete() });
    batchSize += 2;
    migrated += 1;

    if (batchSize >= 400) await commitBatch();
  }

  await commitBatch();
  console.log(`${migrated} bayi migration kapsamına alındı${isDryRun ? ' (DRY_RUN, yazma yapılmadı)' : ''}.`);
};

migrateDealers().catch(error => {
  console.error('Bayi migration başarısız:', error);
  process.exitCode = 1;
});
