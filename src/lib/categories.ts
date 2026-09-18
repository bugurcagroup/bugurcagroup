import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { firestore } from './firebase';

const CATEGORIES_COLLECTION = 'categories';

export const subscribeToCategories = (
  onChange: (categories: string[]) => void,
  onError: (error: Error) => void,
) => onSnapshot(
  collection(firestore, CATEGORIES_COLLECTION),
  snapshot => onChange(snapshot.docs.map(item => String(item.data().name || '')).filter(Boolean).sort((a, b) => a.localeCompare(b, 'tr'))),
  error => onError(error),
);

export const addCategory = async (name: string): Promise<string> => {
  const normalizedName = name.trim();
  const categoryId = encodeURIComponent(normalizedName.toLocaleLowerCase('tr-TR'));
  await setDoc(doc(firestore, CATEGORIES_COLLECTION, categoryId), {
    name: normalizedName,
    createdAt: new Date().toISOString(),
  }, { merge: true });
  return normalizedName;
};
