// POS counter sales and held carts.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { useTestServer } from './helpers/server.ts';
import { api, login } from './helpers/http.ts';
import { adminProduct, fixture } from './helpers/orders.ts';

useTestServer();

const RICE = fixture('TEST-RICE-5KG'); // 450

async function sell(productId: string, quantity: number, extra: Record<string, unknown> = {}) {
  return api(await login('super')).post('/api/pos/sales', {
    items: [{ productId, quantity }],
    payments: [{ method: 'cash', amount: RICE.price * quantity }],
    ...extra,
  });
}

describe('POS sales', () => {
  it('records a cash sale and deducts stock', async () => {
    const rice = await adminProduct(RICE.sku);
    const res = await sell(rice.id, 2);
    assert.equal(res.status, 201, JSON.stringify(res.body));
    const o = res.body.order;
    assert.equal(o.source, 'pos');
    assert.equal(o.total, RICE.price * 2);
    assert.equal(o.paymentStatus, 'paid');
    assert.match(o.orderNumber, /^POS-\d{13}$/);
    assert.match(o.invoiceNumber, /^POS-INV-\d{13}$/);
    assert.equal((await adminProduct(RICE.sku)).stockQuantity, rice.stockQuantity - 2);
  });

  it('parallel sales all succeed with distinct numbers (#24)', async () => {
    const rice = await adminProduct(RICE.sku);
    const results = await Promise.all(Array.from({ length: 10 }, () => sell(rice.id, 1)));
    assert.deepEqual(
      results.map((r) => r.status),
      results.map(() => 201),
      JSON.stringify(results.find((r) => r.status !== 201)?.body)
    );
    const numbers = results.map((r) => r.body.order.invoiceNumber);
    assert.equal(new Set(numbers).size, numbers.length);
  });

  it('parallel holds all succeed with distinct numbers (#24)', async () => {
    const rice = await adminProduct(RICE.sku);
    const token = await login('super');
    const results = await Promise.all(
      Array.from({ length: 10 }, () => api(token).post('/api/pos/holds', { items: [{ productId: rice.id, quantity: 1 }] }))
    );
    assert.deepEqual(
      results.map((r) => r.status),
      results.map(() => 201),
      JSON.stringify(results.find((r) => r.status !== 201)?.body)
    );
    const numbers = results.map((r) => r.body.order.orderNumber);
    assert.equal(new Set(numbers).size, numbers.length);
    for (const n of numbers) assert.match(n, /^HOLD-\d{13}$/);
  });
});

describe('POS held carts (#87)', () => {
  async function hold(productId: string, quantity: number, extra: Record<string, unknown> = {}) {
    const res = await api(await login('super')).post('/api/pos/holds', { items: [{ productId, quantity }], ...extra });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    return res.body.order;
  }
  async function holdIds(): Promise<string[]> {
    const res = await api(await login('super')).get('/api/pos/holds');
    return res.body.holds.map((h: any) => h.id);
  }
  async function stats() {
    return (await api(await login('super')).get('/api/admin/stats')).body;
  }

  it('a sale completed from a resumed hold removes the hold', async () => {
    const rice = await adminProduct(RICE.sku);
    const h = await hold(rice.id, 2);
    assert.ok((await holdIds()).includes(h.id));

    const before = await stats();
    const sale = await sell(rice.id, 2, { holdId: h.id });
    assert.equal(sale.status, 201, JSON.stringify(sale.body));

    assert.ok(!(await holdIds()).includes(h.id));
    const after = await stats();
    // Holds never counted (#91); the sale (confirmed) is the only new order.
    assert.equal(after.pendingOrdersCount, before.pendingOrdersCount);
    assert.equal(after.ordersCount, before.ordersCount + 1);
  });

  it('a sale never deletes a real order passed as holdId', async () => {
    const rice = await adminProduct(RICE.sku);
    const first = (await sell(rice.id, 1)).body.order;
    const res = await sell(rice.id, 1, { holdId: first.id });
    assert.equal(res.status, 201);
    const detail = await api(await login('super')).get(`/api/admin/orders/${first.id}`);
    assert.equal(detail.status, 200);
  });

  it('holding a resumed cart again replaces the earlier hold', async () => {
    const rice = await adminProduct(RICE.sku);
    const first = await hold(rice.id, 1);
    const second = await hold(rice.id, 3, { holdId: first.id });
    const ids = await holdIds();
    assert.ok(!ids.includes(first.id));
    assert.ok(ids.includes(second.id));
  });

  it('a hold released by an older admin build can still be listed and discarded', async () => {
    const rice = await adminProduct(RICE.sku);
    const token = await login('super');
    const h = await hold(rice.id, 1);
    // Older admin builds clear heldAt when a hold is resumed.
    await api(token).patch(`/api/pos/holds/${h.id}`, { held: false });
    assert.ok((await holdIds()).includes(h.id));

    const del = await api(token).delete(`/api/pos/holds/${h.id}`);
    assert.equal(del.status, 200, JSON.stringify(del.body));
    assert.ok(!(await holdIds()).includes(h.id));
  });

  it('discarding refuses an order that is not a hold', async () => {
    const rice = await adminProduct(RICE.sku);
    const sale = (await sell(rice.id, 1)).body.order;
    const del = await api(await login('super')).delete(`/api/pos/holds/${sale.id}`);
    assert.equal(del.status, 404);
  });
});

describe('POS hold updates (#8)', () => {
  it('cannot change an order that is not a held cart', async () => {
    const token = await login('super');
    const list = await api(token).get('/api/admin/orders?status=delivered');
    const delivered = list.body.orders[0];
    assert.ok(delivered, 'seeded delivered order');
    const res = await api(token).patch(`/api/pos/holds/${delivered.id}`, { held: true });
    assert.equal(res.status, 404);
    const after = await api(token).get(`/api/admin/orders/${delivered.id}`);
    assert.equal(after.body.order.status, 'delivered');
    assert.equal(after.body.order.heldAt, null);
  });

  it('still updates a held cart', async () => {
    const rice = await adminProduct(RICE.sku);
    const token = await login('super');
    const h = (await api(token).post('/api/pos/holds', { items: [{ productId: rice.id, quantity: 1 }] })).body.order;
    const res = await api(token).patch(`/api/pos/holds/${h.id}`, { held: true });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.order.status, 'pending');
  });
});

describe('POS stock under concurrency (#88)', () => {
  it('parallel sales never sell more than is on the shelf', async () => {
    const BASKET = fixture('TEST-BASKET');
    const basket = await adminProduct(BASKET.sku);
    const onShelf = basket.stockQuantity;
    const token = await login('super');
    const results = await Promise.all(
      Array.from({ length: onShelf + 5 }, () =>
        api(token).post('/api/pos/sales', {
          items: [{ productId: basket.id, quantity: 1 }],
          payments: [{ method: 'cash', amount: BASKET.price }],
        })
      )
    );
    const statuses = results.map((r) => r.status);
    assert.equal(statuses.filter((s) => s === 201).length, onShelf, statuses.join(','));
    assert.equal(statuses.filter((s) => s === 400).length, 5, statuses.join(','));
    assert.equal((await adminProduct(BASKET.sku)).stockQuantity, 0);
  });

  it('a short line gives back what other lines took', async () => {
    const rice = await adminProduct(RICE.sku);
    const oil = await adminProduct(fixture('TEST-OIL-1L').sku);
    const res = await api(await login('super')).post('/api/pos/sales', {
      items: [{ productId: rice.id, quantity: 1 }, { productId: oil.id, quantity: oil.stockQuantity + 1 }],
      payments: [{ method: 'cash', amount: 1 }],
    });
    assert.equal(res.status, 400);
    assert.equal((await adminProduct(RICE.sku)).stockQuantity, rice.stockQuantity);
    assert.equal((await adminProduct(fixture('TEST-OIL-1L').sku)).stockQuantity, oil.stockQuantity);
  });
});

describe('POS pricing (#89)', () => {
  it('charges the product price, whatever price the request sends', async () => {
    const rice = await adminProduct(RICE.sku);
    for (const price of [1, -100, 0]) {
      const res = await api(await login('super')).post('/api/pos/sales', {
        items: [{ productId: rice.id, quantity: 2, price }],
        payments: [{ method: 'cash', amount: RICE.price * 2 }],
      });
      assert.equal(res.status, 201, JSON.stringify(res.body));
      assert.equal(res.body.order.items[0].price, RICE.price);
      assert.equal(res.body.order.total, RICE.price * 2);
      assert.equal(res.body.order.paymentStatus, 'paid');
    }
  });

  it('a negative tax rate cannot lower the total', async () => {
    const rice = await adminProduct(RICE.sku);
    const res = await sell(rice.id, 1, { taxPercent: -50 });
    assert.equal(res.status, 201);
    assert.equal(res.body.order.tax, 0);
    assert.equal(res.body.order.total, RICE.price);
  });

  it('a fractional quantity is sold and charged as whole units', async () => {
    const rice = await adminProduct(RICE.sku);
    const res = await api(await login('super')).post('/api/pos/sales', {
      items: [{ productId: rice.id, quantity: 2.5 }],
      payments: [{ method: 'cash', amount: RICE.price * 2 }],
    });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.body.order.items[0].quantity, 2);
    assert.equal(res.body.order.total, RICE.price * 2);
    assert.equal((await adminProduct(RICE.sku)).stockQuantity, rice.stockQuantity - 2);
  });

  it('a held cart is priced the same way', async () => {
    const rice = await adminProduct(RICE.sku);
    const res = await api(await login('super')).post('/api/pos/holds', { items: [{ productId: rice.id, quantity: 1, price: -5 }] });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.body.order.total, RICE.price);
  });
});

describe('POS tendered amounts (#90)', () => {
  async function saleWith(payments: { method: string; amount: number }[], quantity = 1) {
    const rice = await adminProduct(RICE.sku);
    return api(await login('super')).post('/api/pos/sales', { items: [{ productId: rice.id, quantity }], payments });
  }

  it('nothing tendered is a due sale, not a paid one', async () => {
    const res = await saleWith([{ method: 'cash', amount: 0 }]);
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.body.order.paymentStatus, 'due');
    assert.equal(res.body.order.paidAmount, 0);
    assert.equal(res.body.order.dueAmount, RICE.price);
    assert.equal(res.body.order.payments.length, 0);
  });

  it('cash over the total stores the applied amount and keeps the change for the receipt', async () => {
    const res = await saleWith([{ method: 'cash', amount: 500 }]);
    assert.equal(res.status, 201, JSON.stringify(res.body));
    const [p] = res.body.order.payments;
    assert.equal(p.amount, RICE.price);
    assert.equal(p.tendered, 500);
    assert.equal(res.body.order.paidAmount, RICE.price);

    const reprint = await api(await login('super')).get(`/api/admin/pos/receipt/${res.body.order.id}`);
    assert.equal(reprint.body.order.payments[0].tendered, 500);
    assert.equal(reprint.body.order.payments[0].amount, RICE.price);
  });

  it('a card payment above the amount due is refused', async () => {
    const res = await saleWith([{ method: 'card', amount: 1000 }]);
    assert.equal(res.status, 400);
    assert.match(res.body.error, /card payment cannot be more than the amount due/);
  });

  it('an exact card payment and a partial cash payment are recorded as given', async () => {
    const card = await saleWith([{ method: 'card', amount: RICE.price }]);
    assert.equal(card.status, 201);
    assert.equal(card.body.order.paymentStatus, 'paid');
    assert.equal(card.body.order.payments[0].tendered, RICE.price);

    const partial = await saleWith([{ method: 'cash', amount: 100 }]);
    assert.equal(partial.body.order.paymentStatus, 'partial');
    assert.equal(partial.body.order.dueAmount, RICE.price - 100);
    assert.equal(partial.body.order.payments[0].amount, 100);
  });

  it('split payments apply in order; cash change only on the overflow', async () => {
    const res = await saleWith([{ method: 'bkash', amount: 400 }, { method: 'cash', amount: 100 }], 1);
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.deepEqual(res.body.order.payments.map((p: any) => [p.method, p.amount, p.tendered]), [
      ['bkash', 400, 400],
      ['cash', RICE.price - 400, 100],
    ]);
    assert.equal(res.body.order.paymentStatus, 'paid');
  });
});

describe('held carts are not sales (#91)', () => {
  it('a hold changes no revenue, order, customer or invoice figure', async () => {
    const token = await login('super');
    const admin = api(token);
    const rice = await adminProduct(RICE.sku);
    const snapshot = async () => {
      const stats = (await admin.get('/api/admin/stats')).body;
      const report = (await admin.get('/api/admin/reports?range=today')).body;
      const invoices = (await admin.get('/api/admin/invoices')).body.invoices;
      const customers = (await admin.get('/api/admin/customers')).body.customers;
      return {
        revenue: stats.revenue,
        ordersCount: stats.ordersCount,
        pending: stats.pendingOrdersCount,
        active: stats.activeOrdersCount,
        customers: stats.customersCount,
        reportRevenue: report.revenue,
        reportOrders: report.ordersCount,
        invoices: invoices.length,
        customerRows: customers.length,
      };
    };

    const before = await snapshot();
    const hold = await admin.post('/api/pos/holds', {
      items: [{ productId: rice.id, quantity: 2 }],
      customerName: 'Held Only Customer',
      customerPhone: '01999999991',
    });
    assert.equal(hold.status, 201, JSON.stringify(hold.body));
    assert.deepEqual(await snapshot(), before);

    // Selling it is what counts.
    const sale = await sell(rice.id, 2, { holdId: hold.body.order.id });
    assert.equal(sale.status, 201);
    const after = await snapshot();
    assert.equal(after.revenue, before.revenue + RICE.price * 2);
    assert.equal(after.reportRevenue, before.reportRevenue + RICE.price * 2);
    assert.equal(after.invoices, before.invoices + 1);
  });
});
