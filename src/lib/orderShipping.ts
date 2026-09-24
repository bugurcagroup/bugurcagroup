import type { Order, ShippingStatus } from '../types';

export const getOrderShippingStatus = (
  order: Pick<Order, 'shippingStatus' | 'shippingStatusByDealer' | 'dealerId'>,
  dealerId?: string,
): ShippingStatus => {
  const statusKey = dealerId || order.dealerId;
  return order.shippingStatus
    || (statusKey ? order.shippingStatusByDealer?.[statusKey] : undefined)
    || 'preparing';
};

export const getOrderShippingStatusChanges = (
  order: Pick<Order, 'shippingStatusByDealer'>,
  dealerId: string,
  status: ShippingStatus,
): Pick<Order, 'shippingStatusByDealer'> => ({
  shippingStatusByDealer: {
    ...(order.shippingStatusByDealer || {}),
    [dealerId]: status,
  },
});

export const getOrderItemShippingStatus = (
  order: Pick<Order, 'shippingStatus' | 'shippingStatusByDealer' | 'shippingStatusByItem' | 'dealerId'>,
  itemIndex: number,
): ShippingStatus => {
  if (order.shippingStatusByItem && Object.keys(order.shippingStatusByItem).length > 0) {
    return order.shippingStatusByItem[String(itemIndex)] || 'preparing';
  }
  return getOrderShippingStatus(order, order.dealerId);
};

export const getOrderItemShippingCompany = (
  order: Pick<Order, 'shippingCompany' | 'shippingCompanyByItem'>,
  itemIndex: number,
): string => order.shippingCompanyByItem?.[String(itemIndex)] || order.shippingCompany || 'Yurtiçi Kargo';

export const getOrderItemTrackingNumber = (
  order: Pick<Order, 'shippingTrackingNumber' | 'shippingTrackingNumberByItem'>,
  itemIndex: number,
): string => order.shippingTrackingNumberByItem?.[String(itemIndex)] || order.shippingTrackingNumber || '';
