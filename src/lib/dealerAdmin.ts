import { getFunctions, httpsCallable } from 'firebase/functions';
import { firebaseApp } from './firebase';

const functions = getFunctions(firebaseApp);

export interface DealerApplicationInput {
  name: string;
  owner: string;
  sector: string;
  city: string;
  district: string;
  address: string;
  phone: string;
  email: string;
  password: string;
}

export const submitDealerApplicationWithAuth = async (input: DealerApplicationInput): Promise<{ applicationId: string; dealerId: string; authUid: string }> => {
  const callable = httpsCallable<DealerApplicationInput, { applicationId: string; dealerId: string; authUid: string }>(functions, 'submitDealerApplication');
  const result = await callable(input);
  return result.data;
};

export const deleteDealerAccount = async (dealerId: string): Promise<void> => {
  const callable = httpsCallable<{ dealerId: string }, { deleted: boolean }>(functions, 'deleteDealer');
  await callable({ dealerId });
};

export const migrateDealerRecords = async (): Promise<void> => {
  const callable = httpsCallable<void, { migrated: number }>(functions, 'migrateDealers');
  await callable();
};

export const recalculateDealerFinancials = async (): Promise<void> => {
  const callable = httpsCallable<void, { recalculated: number }>(functions, 'recalculateDealerFinancials');
  await callable();
};
