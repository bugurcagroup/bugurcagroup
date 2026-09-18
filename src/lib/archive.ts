import { collection, deleteDoc, deleteField, doc, getDoc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { firebaseAuth, firestore } from './firebase';

export type ArchiveEntityType = 'product' | 'order' | 'commission_request' | 'transaction' | 'receipt';

export interface ArchiveRecord {
  id: string;
  entityType: ArchiveEntityType;
  sourceCollection: string;
  sourceId: string;
  data: Record<string, unknown>;
  archivedAt: string;
  archivedBy?: string;
}

const ARCHIVES_COLLECTION = 'archives';

const archiveIdFor = (entityType: ArchiveEntityType, sourceId: string) => `${entityType}__${encodeURIComponent(sourceId)}`;

export const subscribeToArchives = (onChange: (records: ArchiveRecord[]) => void, onError: (error: Error) => void) => onSnapshot(
  collection(firestore, ARCHIVES_COLLECTION),
  snapshot => onChange(snapshot.docs.map(item => ({ id: item.id, ...item.data() }) as ArchiveRecord)),
  error => onError(error),
);

export const archiveDocument = async (
  sourceCollection: string,
  sourceId: string,
  entityType: ArchiveEntityType,
): Promise<void> => {
  const sourceRef = doc(firestore, sourceCollection, sourceId);
  const sourceSnapshot = await getDoc(sourceRef);
  if (!sourceSnapshot.exists()) return;

  const archivedAt = new Date().toISOString();
  const archiveRef = doc(firestore, ARCHIVES_COLLECTION, archiveIdFor(entityType, sourceId));
  await setDoc(archiveRef, {
    entityType,
    sourceCollection,
    sourceId,
    data: sourceSnapshot.data(),
    archivedAt,
    archivedBy: firebaseAuth.currentUser?.uid || undefined,
  });
  await updateDoc(sourceRef, {
    isDeleted: true,
    deletedAt: archivedAt,
    deletedBy: firebaseAuth.currentUser?.uid || null,
  });
};

export const archiveReceipt = async (orderId: string): Promise<void> => {
  const sourceRef = doc(firestore, 'orders', orderId);
  const sourceSnapshot = await getDoc(sourceRef);
  if (!sourceSnapshot.exists() || sourceSnapshot.data().receiptUploaded !== true) return;
  const sourceData = sourceSnapshot.data();
  const archivedAt = new Date().toISOString();
  await setDoc(doc(firestore, ARCHIVES_COLLECTION, archiveIdFor('receipt', orderId)), {
    entityType: 'receipt',
    sourceCollection: 'orders',
    sourceId: orderId,
    data: {
      receiptUploaded: sourceData.receiptUploaded,
      receiptDataUrl: sourceData.receiptDataUrl,
      receiptFileName: sourceData.receiptFileName,
      receiptStatus: sourceData.receiptStatus,
      receiptMessage: sourceData.receiptMessage,
      receipt: sourceData.receipt,
    },
    archivedAt,
    archivedBy: firebaseAuth.currentUser?.uid || undefined,
  });
  await updateDoc(sourceRef, {
    receiptUploaded: false,
    receiptDataUrl: deleteField(),
    receiptFileName: deleteField(),
    receipt: deleteField(),
    receiptMessage: 'Dekont arşive taşındı.',
  });
};

export const restoreArchive = async (record: ArchiveRecord): Promise<void> => {
  await setDoc(doc(firestore, record.sourceCollection, record.sourceId), {
    ...record.data,
    isDeleted: false,
    deletedAt: deleteField(),
    deletedBy: deleteField(),
  }, { merge: true });
  await deleteDoc(doc(firestore, ARCHIVES_COLLECTION, record.id));
};

export const permanentlyDeleteArchive = async (record: ArchiveRecord): Promise<void> => {
  if (record.entityType === 'receipt') {
    await Promise.all([
      updateDoc(doc(firestore, record.sourceCollection, record.sourceId), {
        receiptUploaded: false,
        receiptDataUrl: deleteField(),
        receiptFileName: deleteField(),
        receipt: deleteField(),
      }),
      deleteDoc(doc(firestore, ARCHIVES_COLLECTION, record.id)),
    ]);
    return;
  }
  await Promise.all([
    deleteDoc(doc(firestore, record.sourceCollection, record.sourceId)),
    deleteDoc(doc(firestore, ARCHIVES_COLLECTION, record.id)),
  ]);
};
