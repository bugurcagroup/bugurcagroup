import { initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  getAuth,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateEmail,
  updatePassword,
  updateProfile,
  type User,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { firebaseApp, firebaseAuth, firebaseConfig, firestore } from './firebase';

export type FirebaseRole = 'admin' | 'bayi' | 'customer';

export interface UserProfile {
  uid: string;
  email: string;
  role: FirebaseRole;
  displayName?: string;
  companyName?: string;
  phone?: string;
  legalAcceptances?: unknown[];
  createdAt?: string;
}

const profileFromUser = (user: User, extraData: Record<string, unknown> = {}): UserProfile => ({
  uid: user.uid,
  email: user.email || '',
  role: 'customer',
  ...extraData,
});

export const registerUser = async (email: string, password: string, extraData: Record<string, unknown> = {}) => {
  const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email.trim().toLowerCase(), password);
  const profile = profileFromUser(userCredential.user, {
    ...extraData,
    role: 'customer',
    createdAt: new Date().toISOString(),
  });
  await setDoc(doc(firestore, 'users', profile.uid), profile);
  return profile;
};

let dealerAuth: ReturnType<typeof getAuth> | null = null;

const functions = getFunctions(firebaseApp);

const restoreAdminProfile = async () => {
  const callable = httpsCallable<void, UserProfile>(functions, 'restoreAdminProfile');
  const result = await callable();
  return result.data;
};

const getDealerAuth = () => {
  if (!dealerAuth) {
    const dealerApp = initializeApp(firebaseConfig, `${firebaseApp.name}-dealer-provisioning`);
    dealerAuth = getAuth(dealerApp);
  }
  return dealerAuth;
};

export const provisionDealerAuth = async (email: string, password: string, displayName: string) => {
  const normalizedEmail = email.trim().toLowerCase();
  const auth = getDealerAuth();
  try {
    const credential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
    await updateProfile(credential.user, { displayName: displayName.trim() });
    await signOut(auth);
    return { uid: credential.user.uid, email: credential.user.email || normalizedEmail };
  } catch (error) {
    if (typeof error !== 'object' || error === null || !('code' in error) || error.code !== 'auth/email-already-in-use') {
      throw error;
    }
    const credential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
    await signOut(auth);
    return { uid: credential.user.uid, email: credential.user.email || normalizedEmail };
  }
};

export const loginUser = async (email: string, password: string) => {
  const normalizedEmail = email.trim().toLowerCase();
  const userCredential = await signInWithEmailAndPassword(firebaseAuth, normalizedEmail, password);
  const profileSnapshot = await getDoc(doc(firestore, 'users', userCredential.user.uid));
  if (profileSnapshot.exists()) return profileSnapshot.data() as UserProfile;

  if (normalizedEmail === 'bugurcagroup@gmail.com') {
    try {
      return await restoreAdminProfile();
    } catch {
      await signOut(firebaseAuth);
      throw new Error('Yönetici profili Firestore üzerinde kurtarılamadı.');
    }
  }

  const customerProfile = profileFromUser(userCredential.user, {
    role: 'customer',
    createdAt: new Date().toISOString(),
  });
  await setDoc(doc(firestore, 'users', customerProfile.uid), customerProfile, { merge: true });
  return customerProfile;
};

export const getAuthErrorMessage = (error: unknown): string => {
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String(error.code)
    : '';

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'E-posta adresi veya şifre hatalı.';
    case 'auth/email-already-in-use':
      return 'Bu e-posta adresiyle zaten bir hesap var. Giriş yapın veya “Şifremi unuttum” bağlantısını kullanın.';
    case 'auth/invalid-email':
      return 'Geçerli bir e-posta adresi girin.';
    case 'auth/user-disabled':
      return 'Bu kullanıcı hesabı devre dışı bırakılmış.';
    case 'auth/requires-recent-login':
      return 'Bu işlem için mevcut şifrenizle yeniden doğrulama yapmanız gerekir.';
    case 'auth/weak-password':
      return 'Yeni şifre en az 6 karakter olmalıdır.';
    case 'auth/operation-not-allowed':
      return 'Firebase Authentication içinde E-posta/Şifre sağlayıcısı etkin değil.';
    case 'auth/api-key-not-valid.-please-pass-a-valid-api-key.':
      return 'Firebase API anahtarı geçersiz. Yayın ortamı Firebase değişkenlerini kontrol edin.';
    case 'auth/network-request-failed':
      return 'Firebase bağlantısı kurulamadı. İnternet bağlantınızı kontrol edin.';
    default:
      return error instanceof Error ? error.message : 'Giriş işlemi tamamlanamadı.';
  }
};

export const resetPassword = async (email: string) => {
  await sendPasswordResetEmail(firebaseAuth, email.trim().toLowerCase());
};

interface UpdateUserAccountInput {
  displayName: string;
  companyName?: string;
  phone?: string;
  email: string;
  currentPassword?: string;
  newPassword?: string;
}

export const updateUserAccount = async (input: UpdateUserAccountInput): Promise<UserProfile> => {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error('Oturumunuz sona ermiş. Lütfen yeniden giriş yapın.');

  const normalizedEmail = input.email.trim().toLowerCase();
  const isEmailChanging = normalizedEmail !== (user.email || '').trim().toLowerCase();
  const isPasswordChanging = Boolean(input.newPassword);

  if ((isEmailChanging || isPasswordChanging) && !input.currentPassword) {
    throw new Error('E-posta veya şifre değişikliği için mevcut şifreniz gereklidir.');
  }

  if (isEmailChanging || isPasswordChanging) {
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email || '', input.currentPassword || ''));
  }
  if (isEmailChanging) await updateEmail(user, normalizedEmail);
  if (isPasswordChanging) await updatePassword(user, input.newPassword!);
  if (user.displayName !== input.displayName.trim()) {
    await updateProfile(user, { displayName: input.displayName.trim() });
  }

  const updatedProfile: UserProfile = {
    uid: user.uid,
    email: normalizedEmail,
    role: 'customer',
    displayName: input.displayName.trim(),
    companyName: input.companyName?.trim() || undefined,
    phone: input.phone?.trim() || undefined,
  };
  const existingProfile = await getDoc(doc(firestore, 'users', user.uid));
  const existingData: Partial<UserProfile> = existingProfile.exists() ? existingProfile.data() as UserProfile : {};
  const mergedProfile = { ...existingData, ...updatedProfile, role: existingData.role || 'customer' } as UserProfile;
  await setDoc(doc(firestore, 'users', user.uid), mergedProfile, { merge: true });
  return mergedProfile;
};

export const logoutUser = () => signOut(firebaseAuth);

export const subscribeToAuthState = (callback: (profile: UserProfile | null) => void) => onAuthStateChanged(firebaseAuth, async user => {
  if (!user) {
    callback(null);
    return;
  }
  try {
    const profileSnapshot = await getDoc(doc(firestore, 'users', user.uid));
    callback(profileSnapshot.exists() ? profileSnapshot.data() as UserProfile : null);
  } catch {
    callback(null);
  }
});
