import { addDoc, collection, doc, getDocs, onSnapshot, orderBy, query, runTransaction, serverTimestamp, where, writeBatch } from 'firebase/firestore';
import type { CommissionRequest, DealerTransaction } from '../types';
import { archiveDocument } from './archive';
import { firestore } from './firebase';

const COMMISSION_REQUESTS_COLLECTION = 'commission_requests';
const TRANSACTIONS_COLLECTION = 'transactions';

const mapRequest = (item: { id: string; data: () => Record<string, unknown> }): CommissionRequest => {
  const data = item.data();
  return { id: item.id, ...data, date: typeof data.date === 'string' ? data.date : new Date().toISOString() } as CommissionRequest;
};

const mapTransaction = (item: { id: string; data: () => Record<string, unknown> }): DealerTransaction => {
  const data = item.data();
  const createdAt = data.createdAt;
  const date = typeof data.date === 'string'
    ? data.date
    : createdAt && typeof createdAt === 'object' && 'toDate' in createdAt
      ? (createdAt as { toDate: () => Date }).toDate().toISOString()
      : new Date().toISOString();
  return { id: item.id, ...data, date } as DealerTransaction;
};

export const createCommissionRequest = async (requestData: Omit<CommissionRequest, 'id' | 'status' | 'date'>) => {
  const reference = await addDoc(collection(firestore, COMMISSION_REQUESTS_COLLECTION), {
    ...requestData,
    status: 'pending',
    createdAt: serverTimestamp(),
    date: new Date().toISOString(),
  });
  return reference.id;
};

export const getDealerCommissionRequests = async (dealerId: string): Promise<CommissionRequest[]> => {
  const requestQuery = query(collection(firestore, COMMISSION_REQUESTS_COLLECTION), where('dealerId', '==', dealerId), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(requestQuery);
  return snapshot.docs.filter(item => item.data().isDeleted !== true).map(mapRequest);
};

export const getAllCommissionRequests = async (): Promise<CommissionRequest[]> => {
  const requestQuery = query(collection(firestore, COMMISSION_REQUESTS_COLLECTION), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(requestQuery);
  return snapshot.docs.filter(item => item.data().isDeleted !== true).map(mapRequest);
};

export const subscribeToAllCommissionRequests = (
  onChange: (requests: CommissionRequest[]) => void,
  onError: (error: Error) => void,
) => onSnapshot(
  query(collection(firestore, COMMISSION_REQUESTS_COLLECTION), orderBy('createdAt', 'desc')),
  snapshot => onChange(snapshot.docs.filter(item => item.data().isDeleted !== true).map(mapRequest)),
  error => onError(error),
);

export const subscribeToDealerCommissionRequests = (
  dealerId: string,
  dealerUserId: string | undefined,
  onChange: (requests: CommissionRequest[]) => void,
  onError: (error: Error) => void,
) => {
  const results = new Map<number, CommissionRequest[]>();
  let hasError = false;
  const emit = () => {
    const uniqueRequests = new Map<string, CommissionRequest>();
    Array.from(results.values()).flat().forEach(request => uniqueRequests.set(request.id, request));
    onChange(Array.from(uniqueRequests.values()).sort((left, right) => right.date.localeCompare(left.date)));
  };
  const queries = [
    query(collection(firestore, COMMISSION_REQUESTS_COLLECTION), where('dealerId', '==', dealerId)),
    ...(dealerUserId ? [query(collection(firestore, COMMISSION_REQUESTS_COLLECTION), where('dealerUserId', '==', dealerUserId))] : []),
  ];
  const unsubscribers = queries.map((requestQuery, index) => onSnapshot(
    requestQuery,
    snapshot => {
      results.set(index, snapshot.docs.filter(item => item.data().isDeleted !== true).map(mapRequest));
      emit();
    },
    error => {
      if (hasError) return;
      hasError = true;
      onError(error);
    },
  ));
  return () => unsubscribers.forEach(unsubscribe => unsubscribe());
};

export const updateCommissionStatus = async (requestId: string, status: CommissionRequest['status']) => {
  await runTransaction(firestore, async transaction => {
    const requestReference = doc(firestore, COMMISSION_REQUESTS_COLLECTION, requestId);
    const requestSnapshot = await transaction.get(requestReference);
    if (!requestSnapshot.exists()) throw new Error('Komisyon talebi bulunamadı.');
    if (requestSnapshot.data().status !== 'pending') {
      throw new Error('Bu komisyon talebi daha önce sonuçlandırılmış.');
    }
    transaction.update(requestReference, {
      status,
      updatedAt: serverTimestamp(),
    });
  });
};

export const createCommissionTransaction = async (
  dealerId: string,
  amount: number,
  type: DealerTransaction['type'],
  note?: string,
  dealerUserId?: string,
) => {
  const reference = await addDoc(collection(firestore, TRANSACTIONS_COLLECTION), {
    dealerId,
    ...(dealerUserId ? { dealerUserId } : {}),
    amount,
    type,
    ...(note ? { note } : {}),
    date: new Date().toISOString(),
    createdAt: serverTimestamp(),
  });
  return reference.id;
};

const mapTransactions = (snapshot: { docs: Array<{ id: string; data: () => Record<string, unknown> }> }) =>
  snapshot.docs.map(mapTransaction).sort((left, right) => right.date.localeCompare(left.date));

export const subscribeToAllDealerTransactions = (
  onChange: (transactions: DealerTransaction[]) => void,
  onError: (error: Error) => void,
) => onSnapshot(
  collection(firestore, TRANSACTIONS_COLLECTION),
  snapshot => onChange(mapTransactions(snapshot)),
  error => onError(error),
);

export const subscribeToDealerTransactions = (
  dealerId: string,
  onChange: (transactions: DealerTransaction[]) => void,
  onError: (error: Error) => void,
) => {
  const results = new Map<number, DealerTransaction[]>();
  let hasError = false;
  const emit = () => {
    const uniqueTransactions = new Map<string, DealerTransaction>();
    Array.from(results.values()).flat().forEach(transaction => uniqueTransactions.set(transaction.id, transaction));
    onChange(Array.from(uniqueTransactions.values()).sort((left, right) => right.date.localeCompare(left.date)));
  };
  const queries = [
    query(collection(firestore, TRANSACTIONS_COLLECTION), where('dealerId', '==', dealerId)),
  ];
  const unsubscribers = queries.map((transactionQuery, index) => onSnapshot(
    transactionQuery,
    snapshot => {
      results.set(index, mapTransactions(snapshot));
      emit();
    },
    error => {
      if (hasError) return;
      hasError = true;
      onError(error);
    },
  ));
  return () => unsubscribers.forEach(unsubscribe => unsubscribe());
};

export const subscribeToDealerProductPayouts = (
  onChange: (transactions: DealerTransaction[]) => void,
  onError: (error: Error) => void,
) => onSnapshot(
  query(collection(firestore, TRANSACTIONS_COLLECTION), where('type', '==', 'dealer_product_payout')),
  snapshot => onChange(mapTransactions(snapshot)),
  error => onError(error),
);

export const deleteAllCommissionData = async () => {
  const [requestSnapshot, transactionSnapshot] = await Promise.all([
    getDocs(collection(firestore, COMMISSION_REQUESTS_COLLECTION)),
    getDocs(collection(firestore, TRANSACTIONS_COLLECTION)),
  ]);
  await Promise.all([
    ...requestSnapshot.docs.filter(item => item.data().isDeleted !== true).map(item => archiveDocument(COMMISSION_REQUESTS_COLLECTION, item.id, 'commission_request')),
    ...transactionSnapshot.docs.filter(item => item.data().isDeleted !== true).map(item => archiveDocument(TRANSACTIONS_COLLECTION, item.id, 'transaction')),
  ]);
};
