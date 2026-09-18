import { collection, deleteDoc, doc, getDocs, writeBatch } from 'firebase/firestore';
import { firestore } from './firebase';

const BACKUP_COLLECTIONS = [
  'products',
  'dealers',
  'orders',
  'users',
  'settings',
  'commission_requests',
  'transactions',
  'announcements',
] as const;

const SENSITIVE_KEYS = new Set(['password', 'passwordHash', 'accessToken', 'refreshToken']);

const MAX_RESTORE_DOCS = 5000;

type BackupDocument = {
  id: string;
  data: Record<string, unknown>;
};

export type AppBackup = {
  format: 'bugurca-firestore-backup';
  version: 1;
  createdAt: string;
  collections: Record<string, BackupDocument[]>;
};

const sanitizeFields = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(sanitizeFields);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !SENSITIVE_KEYS.has(key))
        .map(([key, fieldValue]) => [key, sanitizeFields(fieldValue)]),
    );
  }
  return value;
};

export const createAppBackup = async (): Promise<AppBackup> => {
  const collections = Object.fromEntries(
    await Promise.all(BACKUP_COLLECTIONS.map(async collectionName => {
      const snapshot = await getDocs(collection(firestore, collectionName));
      return [
        collectionName,
        snapshot.docs.map(item => ({
          id: item.id,
          data: sanitizeFields(item.data()) as Record<string, unknown>,
        })),
      ];
    })),
  );

  return {
    format: 'bugurca-firestore-backup',
    version: 1,
    createdAt: new Date().toISOString(),
    collections,
  };
};

const isBackup = (value: unknown): value is AppBackup => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<AppBackup>;
  return candidate.format === 'bugurca-firestore-backup'
    && candidate.version === 1
    && typeof candidate.collections === 'object'
    && candidate.collections !== null;
};

export const restoreAppBackup = async (backup: unknown): Promise<void> => {
  if (!isBackup(backup)) throw new Error('Gecersiz veya desteklenmeyen yedek dosyasi.');

  const currentDocuments = new Map<string, Set<string>>();
  await Promise.all(BACKUP_COLLECTIONS.map(async collectionName => {
    const snapshot = await getDocs(collection(firestore, collectionName));
    currentDocuments.set(collectionName, new Set(snapshot.docs.map(item => item.id)));
  }));

  const operations: Array<() => void> = [];
  BACKUP_COLLECTIONS.forEach(collectionName => {
    const raw = backup.collections[collectionName];
    const documents = Array.isArray(raw) ? raw : [];

    if (documents.length > MAX_RESTORE_DOCS) {
      throw new Error(collectionName + ' koleksiyonu cok fazla belge iceriyor (maks ' + MAX_RESTORE_DOCS + ').');
    }

    const restoredIds = new Set(documents.map(item => item.id));

    documents.forEach(item => {
      if (!item || typeof item.id !== 'string' || !item.data || typeof item.data !== 'object') {
        throw new Error(collectionName + ' koleksiyonunda gecersiz belge bulundu.');
      }
      const cleanData = sanitizeFields(item.data) as Record<string, unknown>;
      operations.push(() => {
        const batch = writeBatch(firestore);
        batch.set(doc(firestore, collectionName, item.id), cleanData);
        return batch.commit();
      });
    });

    currentDocuments.get(collectionName)?.forEach(id => {
      if (!restoredIds.has(id)) {
        operations.push(() => deleteDoc(doc(firestore, collectionName, id)));
      }
    });
  });

  for (let index = 0; index < operations.length; index += 450) {
    await Promise.all(operations.slice(index, index + 450).map(operation => operation()));
  }
};
