// One revenue definition (src/lib/revenue.ts) across dashboard, sales chart,
// reports, profit report and customers — pinned against fixed orders.
import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { useTestServer } from './helpers/server.ts';
import { api, login } from './helpers/http.ts';

const server = useTestServer();
let admin: ReturnType<typeof api>;

/**
 * Fixture orders (all created now):
 *   A online pending      1000                  → booked
 *   B online delivered    2000, refund 500      → booked + delivered, net 1500
 *   C online refunded      800, refund 800      → excluded (refund NOT subtracted again)
 *   D online cancelled     300                  → excluded
 *   E pos    confirmed     400                  → booked
 *   F pos    held cart     999                  → excluded (parked, not a sale)
 *   G online returned      700                  → excluded
 */
const FIXTURE = [
  { key: 'A', source: 'online', status: 'pending', total: 1000, phone: '01710000001' },
  { key: 'B', source: 'online', status: 'delivered', total: 2000, phone: '01710000001', refund: 500 },
  { key: 'C', source: 'online', status: 'refunded', total: 800, phone: '01710000002', refund: 800 },
  { key: 'D', source: 'online', status: 'cancelled', total: 300, phone: '01710000002' },
  { key: 'E', source: 'pos', status: 'confirmed', total: 400, phone: '01710000003' },
  { key: 'F', source: 'pos', status: 'pending', total: 999, phone: '01710000003', held: true },
  { key: 'G', source: 'online', status: 'returned', total: 700, phone: '01710000004' },
] as const;

before(async () => {
  admin = api(await login('super'));
  const db = new PrismaClient({ datasources: { db: { url: server.db.url } } });
  try {
    await db.refund.deleteMany();
    await db.order.deleteMany(); // replace the shared seed orders with the fixture
    const product = await db.product.findFirstOrThrow({ where: { sku: 'TEST-RICE-5KG' } });
    for (const f of FIXTURE) {
      const order = await db.order.create({
        data: {
          orderNumber: `REV-${f.key}`,
          trackingCode: `TRK-REV-${f.key}`,
          source: f.source,
          status: f.status,
          heldAt: 'held' in f ? new Date() : null,
          customerName: `Customer ${f.phone}`,
          customerPhone: f.phone,
          customerEmail: '',
          subtotal: f.total,
          total: f.total,
          // One line whose price × qty equals the order total.
          items: {
            create: [{ productId: product.id, productName: product.name, productSku: product.sku, size: '', color: '', quantity: 1, price: f.total }],
          },
        },
      });
      if ('refund' in f) await db.refund.create({ data: { orderId: order.id, amount: f.refund } });
    }
  } finally {
    await db.$disconnect();
  }
});

describe('shared revenue definition', () => {
  it('dashboard revenue is net booked revenue across sources', async () => {
    const res = await admin.get('/api/admin/stats');
    assert.equal(res.status, 200);
    // A 1000 + B (2000 − 500) + E 400
    assert.equal(res.body.revenue, 2900);
  });

  it('sales overview uses the same net figure', async () => {
    const res = await admin.get('/api/admin/sales-overview?range=7d');
    assert.equal(res.body.totalRevenue, 2900);
    assert.equal(res.body.totalOrders, 3);
  });

  it('reports never subtract a refund twice', async () => {
    const res = await admin.get('/api/admin/reports?range=7d');
    assert.equal(res.body.revenue, 3400, 'gross booked: A + B + E');
    assert.equal(res.body.netRevenue, 2900, 'only B’s partial refund is subtracted');
    assert.equal(res.body.totalRefunds, 1300, 'cash refunded in the window is still reported');
    assert.equal(res.body.ordersCount, 3);
  });

  it('reports filter by source and delivered basis', async () => {
    const online = await admin.get('/api/admin/reports?range=7d&source=online');
    assert.equal(online.body.revenue, 3000);
    assert.equal(online.body.netRevenue, 2500);
    const delivered = await admin.get('/api/admin/reports?range=7d&basis=delivered');
    assert.equal(delivered.body.revenue, 2000);
    assert.equal(delivered.body.netRevenue, 1500);
  });

  it('profit report aggregates booked lines with no row cap', async () => {
    const res = await admin.get('/api/admin/reports/profit');
    assert.equal(res.status, 200);
    assert.equal(res.body.totalRevenue, 3400);
    assert.equal(res.body.rows.length, 1, 'one row per product');
    assert.equal(res.body.rows[0].quantity, 3);
    assert.equal(res.body.rows[0].cost, 380 * 3);
    assert.equal(res.body.totalProfit, 3400 - 380 * 3);
  });

  it('customer total spent is net booked revenue', async () => {
    const res = await admin.get('/api/admin/customers');
    const spent = Object.fromEntries(res.body.customers.map((c: any) => [c.phone, c.totalSpent]));
    assert.equal(spent['01710000001'], 2500);
    assert.equal(spent['01710000002'], 0);
    assert.equal(spent['01710000003'], 400, 'held POS cart is not spend');
    assert.equal(spent['01710000004'], 0);
  });
});
