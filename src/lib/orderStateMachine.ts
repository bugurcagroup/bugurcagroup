export type OrderStatus = 'pending' | 'preparing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded' | 'completed';

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['preparing', 'cancelled'],
  preparing: ['shipped', 'cancelled'],
  shipped: ['delivered', 'refunded'],
  delivered: ['refunded'],
  cancelled: [],
  refunded: [],
  completed: ['refunded'],
};

export function canTransitionOrder(current: OrderStatus, next: OrderStatus): boolean {
  if (current === next) return true;
  return VALID_TRANSITIONS[current]?.includes(next) ?? false;
}

export function assertValidTransition(current: OrderStatus, next: OrderStatus): void {
  if (!canTransitionOrder(current, next)) {
    throw new Error(`Geçersiz sipariş durum geçişi engellendi: '${current}' -> '${next}'`);
  }
}