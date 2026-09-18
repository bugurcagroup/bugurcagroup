import { cert, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const getFirebaseAdmin = () => {
  if (getApps().length > 0) return getApp();

  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;
  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    throw new Error('Firebase Admin ortam değişkenleri eksik: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY');
  }

  return initializeApp({
    credential: cert({
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
};

export const getAdminAuth = () => getAuth(getFirebaseAdmin());
export const getAdminDb = () => getFirestore(getFirebaseAdmin());
export const getAdminStorage = () => getStorage(getFirebaseAdmin());
export const getAdmin = () => getFirebaseAdmin();

export const setUserRole = async (uid: string, role: 'admin' | 'bayi' | 'customer') => {
  await getAdminAuth().setCustomUserClaims(uid, { role });
};
