import { collection, deleteDoc, doc, getDocs, onSnapshot, query, setDoc, where } from 'firebase/firestore';
import type { Member } from '../types';
import { firestore } from './firebase';

const USERS_COLLECTION = 'users';

export const upsertDealerMemberProfile = async (dealer: {
  id: string;
  name: string;
  owner: string;
  email: string;
  phone: string;
  createdAt: string;
  authUid?: string;
}) => {
  let existingProfileId = '';
  try {
    const existingSnapshot = await getDocs(query(
      collection(firestore, USERS_COLLECTION),
      where('email', '==', dealer.email.trim().toLowerCase()),
    ));
    existingProfileId = existingSnapshot.docs[0]?.id || '';
  } catch {
    existingProfileId = '';
  }
  const profileId = dealer.authUid || existingProfileId || dealer.id;
  await setDoc(doc(firestore, USERS_COLLECTION, profileId), {
    uid: profileId,
    role: 'bayi',
    dealerId: dealer.id,
    displayName: dealer.owner || dealer.name,
    companyName: dealer.name,
    email: dealer.email.trim().toLowerCase(),
    phone: dealer.phone,
    createdAt: dealer.createdAt,
  }, { merge: true });
  return profileId;
};

export const deleteDealerMemberProfile = async (memberId: string) => {
  await deleteDoc(doc(firestore, USERS_COLLECTION, memberId));
};

export const saveMembersToFirestore = async (previousMembers: Member[], nextMembers: Member[]): Promise<void> => {
  const nextIds = new Set(nextMembers.map(member => member.id));
  const removedMembers = previousMembers.filter(member => !nextIds.has(member.id));

  await Promise.all([
    ...removedMembers.map(member => deleteDealerMemberProfile(member.id)),
    ...nextMembers.map(member => setDoc(doc(firestore, USERS_COLLECTION, member.id), {
      uid: member.id,
      displayName: member.name,
      email: member.email.trim().toLowerCase(),
      ...(member.phone ? { phone: member.phone } : {}),
      createdAt: member.createdAt,
      ...(member.legalAcceptances ? { legalAcceptances: member.legalAcceptances } : {}),
    }, { merge: true })),
  ]);
};

const mapMember = (item: { id: string; data: () => Record<string, unknown> }): Member => {
  const data = item.data();
  return {
    id: item.id,
    name: typeof data.displayName === 'string' ? data.displayName : typeof data.email === 'string' ? data.email : 'Üye',
    email: typeof data.email === 'string' ? data.email : '',
    phone: typeof data.phone === 'string' ? data.phone : undefined,
    createdAt: typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString(),
    legalAcceptances: Array.isArray(data.legalAcceptances) ? data.legalAcceptances : undefined,
  } as Member;
};

export const getMembersFromFirestore = async (): Promise<Member[]> => {
  const snapshot = await getDocs(collection(firestore, USERS_COLLECTION));
  return snapshot.docs.map(mapMember);
};

export const subscribeToMembers = (
  onChange: (members: Member[]) => void,
  onError: (error: Error) => void,
) => onSnapshot(
  collection(firestore, USERS_COLLECTION),
  snapshot => onChange(snapshot.docs.map(mapMember)),
  error => onError(error),
);
