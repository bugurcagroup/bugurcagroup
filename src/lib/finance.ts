import type { Dealer, StoreSettings } from '../types';

export interface OrderFinancials {
  dealerCommissionAmount: number;
  adminCommissionAmount: number;
}

const roundCurrency = (value: number) => Number(value.toFixed(2));

export const calculateOrderFinancials = (
  totalPrice: number,
  dealer: Dealer,
  storeSettings: StoreSettings,
  isFromDealerPage: boolean,
): OrderFinancials => {
  const safeTotal = Math.max(0, Number(totalPrice) || 0);

  if (isFromDealerPage) {
    const adminRate = dealer.privateCommissionRate ?? 5;
    const adminCommissionAmount = roundCurrency(safeTotal * adminRate / 100);
    return {
      adminCommissionAmount,
      dealerCommissionAmount: roundCurrency(safeTotal - adminCommissionAmount),
    };
  }

  const dealerRate = dealer.commissionRate ?? storeSettings.commissionRate;
  const dealerCommissionAmount = roundCurrency(safeTotal * dealerRate / 100);
  return {
    dealerCommissionAmount,
    adminCommissionAmount: roundCurrency(safeTotal - dealerCommissionAmount),
  };
};
