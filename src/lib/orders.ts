import { collection, doc, getDoc, getDocs, onSnapshot, orderBy, query, runTransaction, serverTimestamp, setDoc, updateDoc, where, writeBatch, type Query } from 'firebase/firestore';
import type { Order } from '../types';
import { assertValidTransition } from './orderStateMachine';
import { archiveDocument } from './archive';
import { firestore } from './firebase';

const ORDERS_COLLECTION = 'orders';

type OrderInput = Omit<Order, 'id' | 'date' | 'createdAt'> & {
  userId: string;
  date?: string;
};

const mapOrder = (item: { id: string; data: () => Record<string, unknown> }): Order => {
  const data = item.data();
  const createdAt = data.createdAt;
  const date = typeof data.date === 'string'
    ? data.date
    : createdAt && typeof createdAt === 'object' && 'toDate' in createdAt
      ? (createdAt as { toDate: () => Date }).toDate().toISOString()
      : new Date().toISOString();
  return { id: item.id, ...data, date, createdAt: date } as Order;
};

const getOrderDocumentId = (orderData: OrderInput) => {
  if (!orderData.orderReference) return null;
  const uniqueSuffix = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  return [orderData.userId, orderData.orderReference, orderData.dealerId, uniqueSuffix]
    .map(value => encodeURIComponent(value))
    .join('__');
};

const removeUndefined = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(removeUndefined);
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, nestedValue]) => nestedValue !== undefined)
        .map(([key, nestedValue]) => [key, removeUndefined(nestedValue)])
    );
  }
  return value;
};

const getOrderIdentity = (order: Pick<Order, 'id' | 'orderReference' | 'userId' | 'memberId' | 'customerEmail' | 'dealerId'>) => order.orderReference
  ? `${order.userId || order.memberId || order.customerEmail}__${order.orderReference}__${order.dealerId}`
  : order.id;

const deduplicateOrders = (orders: Order[]) => {
  const seen = new Set<string>();
  return orders.filter(order => {
    const key = getOrderIdentity(order);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const hideSubOrdersWithMaster = (orders: Order[]) => {
  const masterIds = new Set(
    orders
      .filter(order => order.orderRole === 'master')
      .map(order => order.masterOrderId || order.id),
  );
  return orders.filter(order => order.orderRole !== 'sub' || !order.masterOrderId || !masterIds.has(order.masterOrderId));
};

const commitInChunks = async (operations: Array<(batch: ReturnType<typeof writeBatch>) => void>) => {
  for (let index = 0; index < operations.length; index += 450) {
    const batch = writeBatch(firestore);
    operations.slice(index, index + 450).forEach(operation => operation(batch));
    await batch.commit();
  }
};

export async function decreaseStockForOrderItems(items: Array<{ productId: string; quantity: number; unitQuantity?: number }>) {
  await runTransaction(firestore, async (transaction) => {
    const requiredStockByProduct = new Map<string, number>();
    items.forEach(item => {
      const requiredQuantity = item.quantity * (item.unitQuantity || 1);
      requiredStockByProduct.set(item.productId, (requiredStockByProduct.get(item.productId) || 0) + requiredQuantity);
    });

    const productReads = Array.from(requiredStockByProduct.entries()).map(async ([productId, requiredQuantity]) => {
      const prodRef = doc(firestore, 'products', productId);
      const prodSnap = await transaction.get(prodRef);
      if (!prodSnap.exists()) {
        throw new Error(`Ürün bulunamadı: ${productId}`);
      }
      const currentStock = prodSnap.data().stock ?? 0;
      if (currentStock < requiredQuantity) {
        throw new Error(`Yetersiz stok! Ürün ID: ${productId}, Mevcut: ${currentStock}, İstenen: ${requiredQuantity}`);
      }
      return { ref: prodRef, newStock: currentStock - requiredQuantity };
    });

    const resolvedProducts = await Promise.all(productReads);

    resolvedProducts.forEach(({ ref, newStock }) => {
      transaction.update(ref, { stock: newStock, updatedAt: new Date().toISOString() });
    });
  });
}

const getOrderReference = (orderData: OrderInput) => {
  const orderDocumentId = getOrderDocumentId(orderData);
  return orderDocumentId
    ? doc(firestore, ORDERS_COLLECTION, orderDocumentId)
    : doc(collection(firestore, ORDERS_COLLECTION));
};

const prepareOrderData = (orderData: OrderInput) => removeUndefined({
  ...orderData,
  status: orderData.status || 'pending',
  createdAt: serverTimestamp(),
}) as Record<string, unknown>;

export const createOrder = async (orderData: OrderInput) => {
  const reference = getOrderReference(orderData);
  await setDoc(reference, prepareOrderData(orderData), { merge: true });
  return reference.id;
};

export const createOrderBundle = async (masterOrder: OrderInput, subOrders: OrderInput[]) => {
  if (subOrders.length === 1) {
    const singleOrder = {
      ...masterOrder,
      ...subOrders[0],
      items: masterOrder.items,
      totalPrice: masterOrder.totalPrice,
      commissionAmount: masterOrder.commissionAmount,
      adminCommissionAmount: masterOrder.adminCommissionAmount,
      orderRole: 'master' as const,
    };
    const singleReference = getOrderReference(singleOrder);
    await decreaseStockForOrderItems(singleOrder.items);
    await setDoc(singleReference, prepareOrderData({
      ...singleOrder,
      masterOrderId: singleReference.id,
      subOrderIds: [],
    }), { merge: true });
    return singleReference.id;
  }

  const masterReference = getOrderReference(masterOrder);
  const subReferences = subOrders.map(getOrderReference);

  const allItems = subOrders.flatMap(sub => sub.items);
  await decreaseStockForOrderItems(allItems);

  const batch = writeBatch(firestore);

  batch.set(masterReference, prepareOrderData({
    ...masterOrder,
    orderRole: 'master',
    masterOrderId: masterReference.id,
    subOrderIds: subReferences.map(reference => reference.id),
  }), { merge: true });
  subOrders.forEach((subOrder, index) => {
    batch.set(subReferences[index], prepareOrderData({
      ...subOrder,
      orderRole: 'sub',
      masterOrderId: masterReference.id,
    }), { merge: true });
  });
  await batch.commit();
  return masterReference.id;
};

export const getUserOrders = async (userId: string): Promise<Order[]> => {
  const orderQuery = query(
    collection(firestore, ORDERS_COLLECTION),
    where('userId', '==', userId),
  );
  const snapshot = await getDocs(orderQuery);
  return hideSubOrdersWithMaster(deduplicateOrders(snapshot.docs.filter(item => item.data().isDeleted !== true).map(mapOrder)))
    .sort((left, right) => right.date.localeCompare(left.date));
};

export const getAllOrders = async (): Promise<Order[]> => {
  const orderQuery = query(collection(firestore, ORDERS_COLLECTION), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(orderQuery);
  return deduplicateOrders(snapshot.docs.filter(item => item.data().isDeleted !== true).map(mapOrder));
};

const subscribeToOrderQueries = (
  queries: Query[],
  onChange: (orders: Order[]) => void,
  onError: (error: Error) => void,
  hideSubOrders = false,
) => {
  const results = new Map<number, Order[]>();
  let hasError = false;
  const emit = () => {
    const mergedOrders = Array.from(results.values()).flat();
    const uniqueOrders = deduplicateOrders(mergedOrders);
    onChange((hideSubOrders ? hideSubOrdersWithMaster(uniqueOrders) : uniqueOrders).sort((left, right) => right.date.localeCompare(left.date)));
  };
  const unsubscribers = queries.map((orderQuery, index) => onSnapshot(
    orderQuery,
    snapshot => {
      results.set(index, snapshot.docs.filter(item => item.data().isDeleted !== true).map(mapOrder));
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

export const subscribeToDealerOrders = (
  dealerId: string,
  onChange: (orders: Order[]) => void,
  onError: (error: Error) => void,
) => subscribeToOrderQueries(
  [query(collection(firestore, ORDERS_COLLECTION), where('dealerId', '==', dealerId))],
  onChange,
  onError,
);

export const subscribeToUserOrders = (
  userId: string,
  customerEmail: string | undefined,
  onChange: (orders: Order[]) => void,
  onError: (error: Error) => void,
) => subscribeToOrderQueries(
  [
    query(collection(firestore, ORDERS_COLLECTION), where('userId', '==', userId)),
    ...(customerEmail ? [query(collection(firestore, ORDERS_COLLECTION), where('customerEmail', '==', customerEmail.toLowerCase()))] : []),
  ],
  onChange,
  onError,
  true,
);

export const subscribeToAllOrders = (
  onChange: (orders: Order[]) => void,
  onError: (error: Error) => void,
) => onSnapshot(
  query(collection(firestore, ORDERS_COLLECTION), orderBy('createdAt', 'desc')),
  snapshot => onChange(deduplicateOrders(snapshot.docs.filter(item => item.data().isDeleted !== true).map(mapOrder))),
  error => onError(error),
);

export const updateOrder = async (orderId: string, changes: Partial<Omit<Order, 'id' | 'createdAt' | 'date'>>) => {
  const cleaned = removeUndefined(changes) as Record<string, unknown>;
  await updateDoc(doc(firestore, ORDERS_COLLECTION, orderId), {
    ...cleaned,
    updatedAt: serverTimestamp(),
  });
};

export const updateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
  const orderDoc = doc(firestore, ORDERS_COLLECTION, orderId);
  const orderSnap = await getDoc(orderDoc);
  if (!orderSnap.exists()) {
    throw new Error(`Sipariş bulunamadı: ${orderId}`);
  }
  const currentStatus = orderSnap.data().status as Order['status'];
  assertValidTransition(currentStatus, newStatus);
  await updateOrder(orderId, { status: newStatus });
};

export const hideOrderFromMember = async (orderId: string) => {
  await updateDoc(doc(firestore, ORDERS_COLLECTION, orderId), {
    memberHidden: true,
    updatedAt: serverTimestamp(),
  });
};

export const hideOrderFromAdmin = async (orderId: string) => {
  await updateDoc(doc(firestore, ORDERS_COLLECTION, orderId), {
    adminHidden: true,
    updatedAt: serverTimestamp(),
  });
};

export const deleteOrder = async (orderId: string) => {
  await archiveDocument(ORDERS_COLLECTION, orderId, 'order');
};

export const deleteAllOrders = async () => {
  const snapshot = await getDocs(collection(firestore, ORDERS_COLLECTION));
  await Promise.all(snapshot.docs.filter(item => item.data().isDeleted !== true).map(item => archiveDocument(ORDERS_COLLECTION, item.id, 'order')));
};

export const deleteAllTestOrders = async () => {
  const snapshot = await getDocs(query(
    collection(firestore, ORDERS_COLLECTION),
    where('testMode', '==', true),
  ));
  await Promise.all(snapshot.docs.filter(item => item.data().isDeleted !== true).map(item => archiveDocument(ORDERS_COLLECTION, item.id, 'order')));
};

export const upsertOrder = async (order: Order) => {
  const { id, ...data } = order;
  await setDoc(doc(firestore, ORDERS_COLLECTION, id), { ...data, updatedAt: serverTimestamp() }, { merge: true });
};

export const replaceOrders = async (orders: Order[]) => {
  const snapshot = await getDocs(collection(firestore, ORDERS_COLLECTION));
  const desiredIds = new Set(orders.map(order => order.id));
  await Promise.all(snapshot.docs
    .filter(item => item.data().isDeleted !== true && !desiredIds.has(item.id))
    .map(item => archiveDocument(ORDERS_COLLECTION, item.id, 'order')));
  const operations: Array<(batch: ReturnType<typeof writeBatch>) => void> = orders.map(order => {
    const { id, ...data } = order;
    return batch => batch.set(doc(firestore, ORDERS_COLLECTION, id), { ...data, updatedAt: serverTimestamp() }, { merge: true });
  });
  await commitInChunks(operations);
};
