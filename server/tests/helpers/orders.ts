// Builders for storefront checkout requests (POST /api/orders).
import { api, login } from './http.ts';
import { PRODUCTS } from './db.ts';

export type Sku = (typeof PRODUCTS)[number]['sku'];

export function fixture(sku: Sku) {
  return PRODUCTS.find((p) => p.sku === sku)!;
}

/** Live product row (id, stock, …) as the admin API reports it. */
export async function adminProduct(sku: Sku): Promise<any> {
  const res = await api(await login('super')).get('/api/admin/products');
  return res.body.products.find((p: any) => p.sku === sku);
}

export interface CheckoutLine {
  sku: Sku;
  quantity: number;
  /** Price the client claims; defaults to the catalog price. */
  price?: number;
}

export interface CheckoutItem {
  product: { sku: string; name: string; price: number };
  price: number;
  quantity: number;
  selectedSize: { size: string };
  selectedColor: { name: string };
}

/** The same body shape the storefront's StoreContext sends. */
export function checkoutBody(lines: CheckoutLine[], extra: Record<string, unknown> = {}) {
  return {
    items: lines.map((l): CheckoutItem => {
      const p = fixture(l.sku);
      return {
        product: { sku: p.sku, name: p.name, price: p.price },
        price: l.price ?? p.price,
        quantity: l.quantity,
        selectedSize: { size: '' },
        selectedColor: { name: 'Default' },
      };
    }),
    customerAddress: { fullName: 'Checkout Tester', phone: '01711111111', email: 'buyer@test.local', address: 'Dhaka' },
    deliveryMethod: 'inside_dhaka',
    paymentMethod: 'cod',
    ...extra,
  };
}

export function placeOrder(lines: CheckoutLine[], extra?: Record<string, unknown>) {
  return api().post('/api/orders', checkoutBody(lines, extra));
}
