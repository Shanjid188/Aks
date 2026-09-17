// Quick end-to-end API smoke test against a running server (default localhost:4000).
// Run:  tsx src/smoke.ts
const BASE = process.env.API_URL || 'http://localhost:4000';
const EMAIL = 'admin@aksgarments.com.bd';
const PASSWORD = 'Admin@123';

let pass = 0;
let fail = 0;

function check(name: string, ok: boolean, detail?: unknown) {
  if (ok) {
    pass += 1;
    console.log(`  ✅ ${name}`);
  } else {
    fail += 1;
    console.log(`  ❌ ${name}${detail !== undefined ? `\n     ${JSON.stringify(detail)}` : ''}`);
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
  console.log('\n🧪 AKS API smoke test\n');

  // Public
  const health = await api('/api/health');
  check('GET /api/health', health.status === 200 && health.data.status === 'ok', health.data);

  const cat = await api('/api/products');
  check('GET /api/products', cat.status === 200 && Array.isArray(cat.data.products) && cat.data.products.length > 0, { count: cat.data.count });

  const single = cat.data.products[0];
  const slugRes = await api(`/api/products/${single.slug}`);
  check('GET /api/products/:slug', slugRes.status === 200 && slugRes.data.slug === single.slug, slugRes.status);

  const reviews = await api(`/api/products/${single.slug}/reviews`);
  check('GET /api/products/:slug/reviews', reviews.status === 200 && Array.isArray(reviews.data.reviews));

  // Auth
  const login = await api('/api/admin/auth/login', 'POST', { email: EMAIL, password: PASSWORD });
  check('POST /api/admin/auth/login', login.status === 200 && !!login.data.token, login.data);
  const token = login.data.token as string;

  const badLogin = await api('/api/admin/auth/login', 'POST', { email: EMAIL, password: 'wrong' });
  check('Login rejects bad password', badLogin.status === 401);

  // Auth-protected admin routes
  const noToken = await api('/api/admin/stats');
  check('Admin route rejects missing token (401)', noToken.status === 401);

  const stats = await api('/api/admin/stats', 'GET', undefined, token);
  check('GET /api/admin/stats', stats.status === 200 && typeof stats.data.revenue === 'number', { products: stats.data.productsCount });

  const adminProducts = await api('/api/admin/products', 'GET', undefined, token);
  check('GET /api/admin/products', adminProducts.status === 200 && adminProducts.data.count >= 16, { count: adminProducts.data.count });

  const adminOrders = await api('/api/admin/orders', 'GET', undefined, token);
  check('GET /api/admin/orders', adminOrders.status === 200);

  const couponsList = await api('/api/admin/coupons', 'GET', undefined, token);
  check('GET /api/admin/coupons', couponsList.status === 200 && couponsList.data.coupons.length === 4, { count: couponsList.data.coupons?.length });

  const reviewsAdmin = await api('/api/admin/reviews', 'GET', undefined, token);
  check('GET /api/admin/reviews', reviewsAdmin.status === 200 && reviewsAdmin.data.reviews.length > 0, { count: reviewsAdmin.data.reviews?.length });

  // Coupon validation
  const couponVal = await api('/api/coupons/validate', 'POST', { code: 'AKS15' });
  check('POST /api/coupons/validate (AKS15)', couponVal.status === 200 && couponVal.data.valid === true);

  // Create an order
  const orderItem = {
    product: { name: single.name, sku: single.sku, price: single.price },
    productName: single.name,
    selectedSize: cat.data.products[0]?.sizes?.[0],
    selectedColor: cat.data.products[0]?.colors?.[0],
    quantity: 1,
  };
  const createOrder = await api('/api/orders', 'POST', {
    items: [orderItem],
    customerAddress: { fullName: 'Smoke Test User', phone: '01700000000', email: 'smoke@test.com', division: 'Dhaka', district: 'Dhaka', thana: 'Gulshan', streetAddress: '1 Test Rd', postalCode: '1212' },
    deliveryMethod: 'standard',
    paymentMethod: 'cod',
    couponCode: 'FREESHIP',
  });
  check('POST /api/orders', createOrder.status === 201 && createOrder.data.order.trackingCode.startsWith('AKS-BD-'), createOrder.data);
  const trackingCode = createOrder.data.order.trackingCode;

  const track = await api(`/api/orders/track/${trackingCode}`);
  check('GET /api/orders/track/:code', track.status === 200 && track.data.order.trackingCode === trackingCode);

  // Admin can update order status
  const orderId = createOrder.data.order.id;
  const updateStatus = await api(`/api/admin/orders/${orderId}`, 'PATCH', { status: 'processing' }, token);
  check('PATCH /api/admin/orders/:id status', updateStatus.status === 200 && updateStatus.data.order.status === 'processing', { status: updateStatus.data.order?.status });

  console.log(`\n${'='.repeat(30)}`);
  console.log(`Result: ${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

main().catch((e) => {
  console.error('Smoke test crashed:', e);
  process.exit(1);
});