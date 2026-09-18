import { collection, deleteDoc, doc, getDocs, onSnapshot, setDoc } from 'firebase/firestore';
import type { Dealer } from '../types';
import { firestore } from './firebase';

const DEALERS_COLLECTION = 'dealers';
const PUBLIC_DEALERS_COLLECTION = 'dealer_public';
const DEALER_APPLICATIONS_COLLECTION = 'dealer_applications';

export interface DealerApplication {
  id: string;
  name: string;
  owner: string;
  sector: string;
  city: string;
  district: string;
  address: string;
  phone: string;
  email: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  dealerId?: string;
  authUid?: string;
}

type DealerRecord = Omit<Dealer, 'id'>;

const toDealer = (item: { id: string; data: () => Record<string, unknown> }): Dealer => ({
  id: item.id,
  ...item.data(),
} as Dealer);

const toPublicDealer = (dealer: Dealer): DealerRecord => ({
  name: dealer.name,
  owner: dealer.owner,
  city: dealer.city,
  district: dealer.district,
  address: dealer.address,
  phone: dealer.phone,
  email: dealer.email,
  status: dealer.status,
  salesVolume: 0,
  commissionEarned: 0,
  createdAt: dealer.createdAt,
  sector: dealer.sector,
});

export const getDealersFromFirestore = async (): Promise<Dealer[]> => {
  const snapshot = await getDocs(collection(firestore, DEALERS_COLLECTION));
  return snapshot.docs.map(toDealer);
};

export const subscribeToDealers = (onChange: (dealers: Dealer[]) => void, onError: (error: Error) => void) => onSnapshot(
  collection(firestore, DEALERS_COLLECTION),
  snapshot => onChange(snapshot.docs.map(toDealer)),
  error => onError(error),
);

export const subscribeToPublicDealers = (onChange: (dealers: Dealer[]) => void, onError: (error: Error) => void) => onSnapshot(
  collection(firestore, PUBLIC_DEALERS_COLLECTION),
  snapshot => onChange(snapshot.docs.map(toDealer)),
  error => onError(error),
);

const withoutUndefined = <T extends object>(value: T): Partial<T> =>
  Object.fromEntries(Object.entries(value).filter(([, fieldValue]) => fieldValue !== undefined)) as Partial<T>;

const toDealerApplication = (item: { id: string; data: () => Record<string, unknown> }): DealerApplication => {
  const data = item.data();
  return {
    id: item.id,
    name: typeof data.name === 'string' ? data.name : '',
    owner: typeof data.owner === 'string' ? data.owner : '',
    sector: typeof data.sector === 'string' ? data.sector : '',
    city: typeof data.city === 'string' ? data.city : '',
    district: typeof data.district === 'string' ? data.district : '',
    address: typeof data.address === 'string' ? data.address : '',
    phone: typeof data.phone === 'string' ? data.phone : '',
    email: typeof data.email === 'string' ? data.email : '',
    status: data.status === 'approved' || data.status === 'rejected' ? data.status : 'pending',
    createdAt: typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString(),
    dealerId: typeof data.dealerId === 'string' ? data.dealerId : undefined,
    authUid: typeof data.authUid === 'string' ? data.authUid : undefined,
  };
};

export const subscribeToDealerApplications = (
  onChange: (applications: DealerApplication[]) => void,
  onError: (error: Error) => void,
) => onSnapshot(
  collection(firestore, DEALER_APPLICATIONS_COLLECTION),
  snapshot => onChange(snapshot.docs.map(toDealerApplication)),
  error => onError(error),
);

export const updateDealerApplicationStatus = async (
  applicationId: string,
  status: DealerApplication['status'],
): Promise<void> => {
  await setDoc(doc(firestore, DEALER_APPLICATIONS_COLLECTION, applicationId), { status }, { merge: true });
};

export const upsertDealerPrivate = async (dealer: Dealer): Promise<void> => {
  await setDoc(doc(firestore, DEALERS_COLLECTION, dealer.id), withoutUndefined(dealer), { merge: true });
};

export const upsertDealer = async (dealer: Dealer): Promise<void> => {
  await Promise.all([
    upsertDealerPrivate(dealer),
    setDoc(doc(firestore, PUBLIC_DEALERS_COLLECTION, dealer.id), toPublicDealer(dealer), { merge: true }),
  ]);
};

export const deleteDealerFromFirestore = async (dealerId: string): Promise<void> => {
  await Promise.all([
    deleteDoc(doc(firestore, DEALERS_COLLECTION, dealerId)),
    deleteDoc(doc(firestore, PUBLIC_DEALERS_COLLECTION, dealerId)),
  ]);
};
