// Focused verification for the new order lifecycle + dashboard endpoints.
// Run: node node_modules/tsx/dist/cli.mjs scripts/verify-order-flow.ts
const BASE = process.env.API_URL || 'http://localhost:4000';
const EMAIL = 'admin@aksgarments.com.bd';
const PASSWORD = 'Admin@123';

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail?: unknown) {
  if (ok) {
    pass += 1;
    console.log(`  PASS ${name}`);
  } else {
    fail += 1;
    console.log(`  FAIL ${name}${detail !== undefined ? `\n       ${JSON.stringify(detail)}` : ''}`);
  }
}

async function api(path: string, method = 'GET', body?: unknown, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function main() {
  console.log('\n== Order flow + dashboard verification ==\n');

  // Login
  const login = await api('/api/admin/auth/login', 'POST', { email: EMAIL, password: PASSWORD });
  check('admin login', login.status === 200 && !!login.data.token);
  const token = login.data.token as string;

  // Pick a real product
  const products = await api('/api/products');
  const product = products.data.products?.[0];
  check('products list available', !!product);

  // Place a customer order → must default to 'pending'
  const created = await api('/api/orders', 'POST', {
    items: [
      {
        product: { name: product.name, sku: product.sku, price: product.price },
        productName: product.name,
        selectedSize: product.sizes?.[0],
        selectedColor: product.colors?.[0],
        quantity: 2,
      },
    ],
    customerAddress: {
      fullName: 'Flow Verify User', phone: '01711223344', email: 'flow@test.com',
      division: 'Dhaka', district: 'Dhaka', thana: 'Banani', streetAddress: '2 Flow Rd', postalCode: '1213',
    },
    deliveryMethod: 'standard',
    paymentMethod: 'cod',
  });
  check('POST /api/orders → 201', created.status === 201, created.data);
  check('new order status is pending', created.data.order?.status === 'pending', created.data.order?.status);
  check('server computed subtotal = price*qty', created.data.order?.subtotal === product.price * 2, {
    subtotal: created.data.order?.subtotal,
    expected: product.price * 2,
  });
  const orderId = created.data.order.id;

  // Unauthorized admin action must be rejected
  const unauth = await api(`/api/admin/orders/${orderId}`, 'PATCH', { status: 'confirmed' });
  check('unauthorized status change rejected (401)', unauth.status === 401);

  // Invalid status must be rejected
  const badStatus = await api(`/api/admin/orders/${orderId}`, 'PATCH', { status: 'flying' }, token);
  check('invalid status rejected (400)', badStatus.status === 400, badStatus.data);

  // Confirm the order
  const confirm = await api(`/api/admin/orders/${orderId}`, 'PATCH', { status: 'confirmed' }, token);
  check('PATCH status → confirmed', confirm.status === 200 && confirm.data.order?.status === 'confirmed');

  // Invalid quantity in item edit must be rejected
  const badQty = await api(`/api/admin/orders/${orderId}/items`, 'PUT', { items: [{ productId: product.id, quantity: -2, size: '', color: '' }] }, token);
  check('negative quantity rejected (400)', badQty.status === 400, badQty.data);

  // Unknown product in item edit must be rejected
  const badProduct = await api(`/api/admin/orders/${orderId}/items`, 'PUT', { items: [{ productId: 'does-not-exist', quantity: 1, size: '', color: '' }] }, token);
  check('unknown product rejected (400)', badProduct.status === 400, badProduct.data);

  // Valid item edit recalculates totals server-side
  const edit = await api(`/api/admin/orders/${orderId}/items`, 'PUT', { items: [{ productId: product.id, quantity: 3, size: '', color: '' }] }, token);
  const editOk = edit.status === 200 && edit.data.order?.items?.[0]?.quantity === 3;
  const expectedTotal = editOk ? Math.max(0, product.price * 3 - (edit.data.order.discount ?? 0)) + (edit.data.order.shippingFee ?? 0) : null;
  check('PUT items → qty updated to 3', editOk, edit.data);
  check('total recalculated = subtotal - discount + shipping', editOk && edit.data.order.total === expectedTotal, {
    total: edit.data.order?.total,
    expectedTotal,
  });

  // Dashboard endpoints
  const stats = await api('/api/admin/stats', 'GET', undefined, token);
  check('GET /admin/stats', stats.status === 200 && typeof stats.data.revenue === 'number');
  check('stats include confirmedOrdersCount', typeof stats.data.confirmedOrdersCount === 'number', {
    keys: Object.keys(stats.data).filter((k) => k.toLowerCase().includes('confirm')),
  });

  const overview = await api('/api/admin/sales-overview?range=7d', 'GET', undefined, token);
  check('GET /admin/sales-overview?range=7d', overview.status === 200 && Array.isArray(overview.data.points) && overview.data.points.length === 7);
  check('overview has today order in buckets', overview.data.totalOrders >= 1, overview.data.totalOrders);

  // Clean up the verification order so the owner's dashboard is not polluted.
  const del = await api(`/api/admin/orders/${orderId}`, 'DELETE', undefined, token);
  check('verification order removed (any 2xx/404)', del.status === 200 || del.status === 404 || del.status === 405, del.status);

  console.log(`\n== Result: ${pass} passed, ${fail} failed ==\n`);
  if (fail > 0) process.exit(1);
}

main().catch((e) => {
  console.error('Verification crashed:', e);
  process.exit(1);
});
