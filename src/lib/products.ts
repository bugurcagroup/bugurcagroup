import { addDoc, collection, doc, getDocs, onSnapshot, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import type { Product } from '../types';
import { archiveDocument } from './archive';
import { firestore } from './firebase';

const PRODUCTS_COLLECTION = 'products';

export const getProductsFromFirestore = async (): Promise<Product[]> => {
  const snapshot = await getDocs(collection(firestore, PRODUCTS_COLLECTION));
  return snapshot.docs.filter(item => item.data().isDeleted !== true).map(item => ({ id: item.id, ...item.data() })) as Product[];
};

export const subscribeToProducts = (onChange: (products: Product[]) => void, onError: (error: Error) => void) => onSnapshot(
  collection(firestore, PRODUCTS_COLLECTION),
  snapshot => onChange(snapshot.docs.filter(item => item.data().isDeleted !== true).map(item => ({ id: item.id, ...item.data() })) as Product[]),
  error => onError(error),
);

export const addProduct = async (productData: Omit<Product, 'id'>): Promise<string> => {
  const document = await addDoc(collection(firestore, PRODUCTS_COLLECTION), productData);
  return document.id;
};

export const updateProduct = async (id: string, productData: Partial<Product>) => {
  await updateDoc(doc(firestore, PRODUCTS_COLLECTION, id), productData);
};

export const upsertProduct = async (product: Product) => {
  await setDoc(doc(firestore, PRODUCTS_COLLECTION, product.id), product, { merge: true });
};

export const upsertProductsBatch = async (products: Product[], categories: string[] = []) => {
  const writes = [
    ...products.map(product => ({ reference: doc(firestore, PRODUCTS_COLLECTION, product.id), data: product })),
    ...categories.map(category => ({
      reference: doc(firestore, 'categories', encodeURIComponent(category.trim().toLocaleLowerCase('tr-TR'))),
      data: { name: category.trim(), createdAt: new Date().toISOString() },
    })),
  ];
  for (let offset = 0; offset < writes.length; offset += 500) {
    const batch = writeBatch(firestore);
    writes.slice(offset, offset + 500).forEach(({ reference, data }) => {
      batch.set(reference, data, { merge: true });
    });
    await batch.commit();
  }
};

export const deleteProduct = async (id: string) => {
  await archiveDocument(PRODUCTS_COLLECTION, id, 'product');
};
