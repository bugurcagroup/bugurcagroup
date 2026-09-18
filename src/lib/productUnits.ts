import type { Product, SaleUnit } from '../types';

export const getProductUnitQuantity = (product: Product, unit: SaleUnit): number => {
  if (unit === 'dozen') return product.dozenQuantity || 12;
  if (unit === 'box') return product.boxQuantity || 1;
  return 1;
};

export const getProductUnitPrice = (product: Product, unit: SaleUnit): number => {
  if (unit === 'dozen') return product.dozenPrice ?? product.price * getProductUnitQuantity(product, unit);
  if (unit === 'box') return product.boxPrice ?? product.price * getProductUnitQuantity(product, unit);
  return product.price;
};

export const getProductUnitLabel = (unit: SaleUnit): string => {
  if (unit === 'dozen') return 'Düzine';
  if (unit === 'box') return 'Koli';
  return 'Adet';
};
