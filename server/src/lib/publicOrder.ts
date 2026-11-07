import { parseJsonSafe } from '../utils/json.ts';

/**
 * The order shape the storefront sees. Built from an allow-list, so internal
 * columns (admin notes, cost snapshots, staff ids, payment references) never
 * reach a public response, including ones added to the schema later.
 */

type OrderRow = {
  customerAddress: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerNote?: string | null;
  items?: ItemRow[];
  [k: string]: unknown;
};

type ItemRow = {
  id: string;
  productId: string | null;
  productName: string;
  productSku: string;
  size: string;
  color: string;
  quantity: number;
  price: number;
  product?: { id: string; name: string; images: string } | null;
};

const ORDER_FIELDS = [
  'id',
  'orderNumber',
  'trackingCode',
  'status',
  'source',
  'invoiceNumber',
  'deliveryMethod',
  'pickupStore',
  'paymentMethod',
  'paymentStatus',
  'paidAmount',
  'dueAmount',
  'subtotal',
  'discount',
  'shippingFee',
  'tax',
  'total',
  'couponCode',
  'estimatedDelivery',
  'packedStatus',
  'dispatchedAt',
  'receivedAt',
  'createdAt',
  'updatedAt',
] as const;

/** Address parts that locate a delivery area but not a household. */
const AREA_FIELDS = ['thana', 'district', 'division'] as const;

/** "Rahim Uddin" → "Rahim U." */
export function maskName(name: string): string {
  const [first, ...rest] = name.trim().split(/\s+/);
  if (!first) return '';
  return [first, ...rest.map((part) => `${part[0]}.`)].join(' ');
}

/** "01712345678" → "017******78" */
export function maskPhone(phone: string): string {
  const p = phone.trim();
  if (p.length <= 5) return '*'.repeat(p.length);
  return `${p.slice(0, 3)}${'*'.repeat(p.length - 5)}${p.slice(-2)}`;
}

function publicItem(it: ItemRow) {
  return {
    id: it.id,
    productId: it.productId,
    productName: it.productName,
    productSku: it.productSku,
    size: it.size,
    color: it.color,
    quantity: it.quantity,
    price: it.price,
    ...(it.product !== undefined && {
      product: it.product
        ? { id: it.product.id, name: it.product.name, images: parseJsonSafe<string[]>(String(it.product.images ?? ''), []) }
        : null,
    }),
  };
}

/**
 * Serialise an order for a public response. With `contact` (the customer who
 * just placed it) name, phone, email and the full address are included;
 * otherwise only the masked name and phone and the delivery area.
 */
export function toPublicOrder(order: OrderRow, { contact = false }: { contact?: boolean } = {}) {
  const out: Record<string, unknown> = {};
  for (const key of ORDER_FIELDS) if (key in order) out[key] = order[key];

  const parsed = parseJsonSafe<unknown>(order.customerAddress, {});
  const address = (parsed && typeof parsed === 'object' ? parsed : {}) as Record<string, unknown>;
  if (contact) {
    out.customerName = order.customerName;
    out.customerPhone = order.customerPhone;
    out.customerEmail = order.customerEmail;
    out.customerNote = order.customerNote ?? null;
    out.customerAddress = address;
  } else {
    const area: Record<string, unknown> = {};
    for (const key of AREA_FIELDS) if (typeof address[key] === 'string') area[key] = address[key];
    out.customerName = maskName(order.customerName);
    out.customerPhone = maskPhone(order.customerPhone);
    out.customerAddress = {
      ...area,
      fullName: maskName(String(address.fullName ?? order.customerName)),
      phone: maskPhone(String(address.phone ?? order.customerPhone)),
    };
  }

  out.items = (order.items ?? []).map(publicItem);
  return out;
}
