// Ad spend: CSV parsing (Google Ads export), exchange rates (never guessed),
// import preview/commit/re-import, campaign linking, Reports line, Meta
// Insights sync against a local fake Graph API, permissions and audit.
import http from 'node:http';
import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { useTestServer } from './helpers/server.ts';
import { api, login } from './helpers/http.ts';
import { placeOrder } from './helpers/orders.ts';
import { parseSpendCsv, spendDay, toBdt } from '../src/lib/adSpend.ts';

const seen: { path: string; auth: string | undefined; query: string }[] = [];
let metaFails = false;
const fake = http.createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://fake');
  seen.push({ path: url.pathname, auth: req.headers.authorization, query: url.search });
  res.setHeader('Content-Type', 'application/json');
  if (metaFails) {
    res.writeHead(400);
    return res.end(JSON.stringify({ error: { message: 'Invalid OAuth access token.', code: 190 } }));
  }
  const page2 = url.searchParams.get('after') === 'p2';
  const base = `http://127.0.0.1:${(fake.address() as AddressInfo).port}`;
  res.end(
    JSON.stringify(
      page2
        ? { data: [{ campaign_id: '777', campaign_name: 'Meta Winter', spend: '12.50', impressions: '900', clicks: '30', account_currency: 'USD', date_start: '2026-11-02' }] }
        : {
            data: [{ campaign_id: '777', campaign_name: 'Meta Winter', spend: '10.00', impressions: '1000', clicks: '40', account_currency: 'USD', date_start: '2026-11-01' }],
            paging: { next: `${base}/v26.0/act_123456789/insights?after=p2` },
          }
    )
  );
});
await new Promise<void>((r) => fake.listen(0, '127.0.0.1', () => r()));
fake.unref();

for (const k of ['META_ADS_ACCESS_TOKEN', 'META_AD_ACCOUNT_ID']) delete process.env[k];
process.env.INTEGRATION_ENCRYPTION_KEY = 'b'.repeat(64);
process.env.META_GRAPH_API_BASE = `http://127.0.0.1:${(fake.address() as AddressInfo).port}`;
process.env.DISABLE_JOBS = 'true';

useTestServer();
let admin: ReturnType<typeof api>;
let staff: ReturnType<typeof api>;
before(async () => {
  admin = api(await login('super'));
  staff = api(await login('staff'));
});

const GOOGLE_CSV = [
  'Campaign report',
  '"November 1, 2026 - November 3, 2026"',
  'Day,Campaign,Campaign ID,Currency code,Cost,Impr.,Clicks',
  '2026-11-01,Search – Rice,111,USD,"1,000.50","12,000",300',
  '2026-11-02,Search – Rice,111,USD,20.00,500,10',
  '2026-11-02,Brand,222,USD,--,10,0',
  'Total: Account,,,,"1,020.50",,',
].join('\r\n');

describe('parseSpendCsv', () => {
  it('reads a Google Ads export: title lines, thousands separators, "--", totals', () => {
    const p = parseSpendCsv(GOOGLE_CSV, 'google', null);
    assert.equal(p.rows.length, 2);
    assert.equal(p.rows[0].amount, 1000.5);
    assert.equal(p.rows[0].impressions, 12000);
    assert.equal(p.rows[0].platformCampaignId, '111');
    assert.equal(p.rows[0].currency, 'USD');
    assert.equal(p.skipped, 2, 'no-spend row and the totals row');
    assert.deepEqual(p.errors, []);
  });

  it('never guesses the currency', () => {
    const csv = 'Day,Campaign,Cost\n2026-11-01,Eid,50';
    assert.throws(() => parseSpendCsv(csv, 'google', null), /currency/i);
    assert.equal(parseSpendCsv(csv, 'google', 'BDT').rows[0].currency, 'BDT');
    assert.equal(parseSpendCsv('Day,Campaign,Cost (EUR)\n2026-11-01,Eid,5', 'google', null).rows[0].currency, 'EUR');
  });

  it('reports bad lines without dropping good ones', () => {
    const p = parseSpendCsv('Day,Campaign,Cost\nnot-a-date,A,1\n2026-11-01,B,abc\n2026-11-01,C,3', 'other', 'BDT');
    assert.equal(p.rows.length, 1);
    assert.deepEqual(p.errors.map((e) => e.line), [2, 3]);
  });
});

describe('toBdt', () => {
  const fx = { byCurrency: new Map([['USD', [{ rateToBdt: 122, effectiveFrom: spendDay('2026-11-02')! }, { rateToBdt: 120, effectiveFrom: spendDay('2026-10-01')! }]]]) };
  it('uses the latest rate in effect on the day, and null without one', () => {
    assert.equal(toBdt(10, 'BDT', spendDay('2020-01-01')!, fx), 10);
    assert.equal(toBdt(10, 'USD', spendDay('2026-11-01')!, fx), 1200);
    assert.equal(toBdt(10, 'USD', spendDay('2026-11-05')!, fx), 1220);
    assert.equal(toBdt(10, 'USD', spendDay('2026-09-30')!, fx), null);
    assert.equal(toBdt(10, 'EUR', spendDay('2026-11-05')!, fx), null);
  });
});

describe('ad spend API', () => {
  it('previews, imports, and re-imports without duplicates; links orders to new campaigns', async () => {
    // An order tagged before the campaign exists.
    const order = await placeOrder([{ sku: 'TEST-RICE-5KG', quantity: 1 }], {
      attribution: { last: { source: 'google', medium: 'cpc', campaign: 'Search – Rice', id: '111', at: Date.now() - 86_400_000 } },
    });
    assert.equal(order.status, 201);

    const preview = await admin.post('/api/admin/advertising/spend/import', { platform: 'google', csv: GOOGLE_CSV });
    assert.equal(preview.status, 200);
    assert.equal(preview.body.preview.rows, 2);
    assert.deepEqual(preview.body.preview.missingFx, ['USD']);
    assert.equal((await admin.get('/api/admin/advertising/spend')).body.totalCount, 0, 'dry run saves nothing');

    const commit = await admin.post('/api/admin/advertising/spend/import', { platform: 'google', csv: GOOGLE_CSV, dryRun: false });
    assert.equal(commit.status, 200);
    assert.equal(commit.body.result.campaignsCreated, 1);
    assert.equal(commit.body.result.ordersRelinked, 2, 'first + last touch of the tagged order');
    await admin.post('/api/admin/advertising/spend/import', { platform: 'google', csv: GOOGLE_CSV, dryRun: false });

    const list = await admin.get('/api/admin/advertising/spend');
    assert.equal(list.body.totalCount, 2, 're-import replaced the rows');
    assert.equal(list.body.totals.spendBdt, 0, 'USD without a rate is not converted');
    assert.equal(list.body.totals.unconvertedRows, 2);
    assert.equal(list.body.entries[0].amountBdt, null);

    const campaigns = (await admin.get('/api/admin/advertising/campaigns')).body.campaigns;
    const rice = campaigns.find((c: any) => c.platformCampaignId === '111');
    assert.equal(rice.platform, 'google');
    assert.equal(rice.lastTouchOrders, 1);
  });

  it('converts with admin exchange rates once they exist', async () => {
    assert.equal((await admin.post('/api/admin/advertising/fx-rates', { currency: 'BDT', rateToBdt: 1, effectiveFrom: '2026-01-01' })).status, 400);
    assert.equal((await admin.post('/api/admin/advertising/fx-rates', { currency: 'USD', rateToBdt: -1, effectiveFrom: '2026-01-01' })).status, 400);
    const created = await admin.post('/api/admin/advertising/fx-rates', { currency: 'usd', rateToBdt: 120, effectiveFrom: '2026-11-02' });
    assert.equal(created.status, 201);
    let totals = (await admin.get('/api/admin/advertising/spend')).body.totals;
    assert.equal(totals.spendBdt, 2400, 'only 2026-11-02 is covered');
    assert.equal(totals.unconvertedRows, 1);
    await admin.post('/api/admin/advertising/fx-rates', { currency: 'USD', rateToBdt: 118, effectiveFrom: '2026-10-01' });
    totals = (await admin.get('/api/admin/advertising/spend')).body.totals;
    assert.equal(totals.spendBdt, 1000.5 * 118 + 2400);
    assert.equal(totals.unconvertedRows, 0);

    const fx = (await admin.get('/api/admin/advertising/fx-rates')).body;
    assert.deepEqual(fx.spendCurrencies, [{ currency: 'USD', firstSpendDate: '2026-11-01' }]);
  });

  it('adds manual entries and shows spend in Reports for the same window', async () => {
    const campaign = (await admin.post('/api/admin/advertising/campaigns', { name: 'Influencer', channel: 'other' })).body.campaign;
    assert.equal((await admin.post('/api/admin/advertising/spend', { campaignId: campaign.id, date: '2026-11-03', currency: 'BDT', amount: -5 })).status, 400);
    const manual = await admin.post('/api/admin/advertising/spend', { campaignId: campaign.id, date: '2026-11-03', currency: 'BDT', amount: 5000, note: 'Reel' });
    assert.equal(manual.status, 201);

    const report = await admin.get('/api/admin/reports?from=2026-11-03T00:00:00%2B06:00&to=2026-11-03T23:59:59%2B06:00');
    assert.equal(report.body.adSpend.spendBdt, 5000);
    const wide = await admin.get('/api/admin/reports?from=2026-10-25T00:00:00%2B06:00&to=2026-11-04T00:00:00%2B06:00');
    assert.equal(wide.body.adSpend.spendBdt, 1000.5 * 118 + 2400 + 5000);

    assert.equal((await admin.delete(`/api/admin/advertising/spend/${manual.body.entry.id}`)).status, 200);
    const audit = (await admin.get('/api/admin/activity?entity=ad_spend')).body.logs.map((l: any) => l.action);
    assert.ok(['ad_spend.imported', 'ad_spend.created', 'ad_spend.deleted'].every((a) => audit.includes(a)));
    assert.ok((await admin.get('/api/admin/activity?entity=fx_rate')).body.logs.some((l: any) => l.action === 'fx_rate.created'));
  });

  it('requires spend permissions', async () => {
    assert.equal((await staff.get('/api/admin/advertising/spend')).status, 403);
    assert.equal((await staff.post('/api/admin/advertising/spend/import', { platform: 'google', csv: GOOGLE_CSV })).status, 403);
    assert.equal((await staff.post('/api/admin/advertising/fx-rates', { currency: 'USD', rateToBdt: 1, effectiveFrom: '2026-01-01' })).status, 403);
    assert.equal((await staff.get('/api/admin/advertising/integrations')).status, 403);
  });
});

describe('Meta Ads sync', () => {
  const TOKEN = 'EAAG-ads-read-token-secret-4321';

  it('refuses to sync until connected', async () => {
    const res = await admin.post('/api/admin/advertising/integrations/meta-ads/sync', { from: '2026-11-01', to: '2026-11-02' });
    assert.equal(res.status, 400);
  });

  it('pulls daily campaign insights with the token in a header only', async () => {
    assert.equal((await admin.put('/api/admin/advertising/integrations/meta-ads', { accountId: 'not-an-id' })).status, 400);
    assert.equal((await admin.put('/api/admin/advertising/integrations/meta-ads', { accountId: 'act_123456789' })).status, 200);
    assert.equal((await admin.put('/api/admin/advertising/secrets/META_ADS_ACCESS_TOKEN', { value: TOKEN })).status, 200);

    const view = await admin.get('/api/admin/advertising/integrations');
    assert.equal(view.body.metaAds.connected, true);
    assert.equal(view.body.metaAds.accountId, '123456789');
    assert.ok(!JSON.stringify(view.body).includes(TOKEN));

    const tooLong = await admin.post('/api/admin/advertising/integrations/meta-ads/sync', { from: '2026-01-01', to: '2026-11-01' });
    assert.equal(tooLong.status, 400);

    seen.length = 0;
    const sync = await admin.post('/api/admin/advertising/integrations/meta-ads/sync', { from: '2026-11-01', to: '2026-11-02' });
    assert.equal(sync.status, 200, JSON.stringify(sync.body));
    assert.equal(sync.body.outcome.rowsUpserted, 2, 'both pages');
    assert.equal(seen[0].path, '/v26.0/act_123456789/insights');
    assert.ok(seen.every((s) => s.auth === `Bearer ${TOKEN}` && !s.query.includes(TOKEN)));
    assert.match(decodeURIComponent(seen[0].query), /"since":"2026-11-01","until":"2026-11-02"/);

    const rows = (await admin.get('/api/admin/advertising/spend?platform=meta')).body.entries;
    assert.deepEqual(rows.map((r: any) => [r.date, r.amount, r.source]), [['2026-11-02', 12.5, 'meta_api'], ['2026-11-01', 10, 'meta_api']]);
    assert.equal(rows[0].campaign.name, 'Meta Winter');

    // Re-sync is idempotent.
    await admin.post('/api/admin/advertising/integrations/meta-ads/sync', { from: '2026-11-01', to: '2026-11-02' });
    assert.equal((await admin.get('/api/admin/advertising/spend?platform=meta')).body.totalCount, 2);
  });

  it('records failed syncs without leaking the token', async () => {
    metaFails = true;
    const res = await admin.post('/api/admin/advertising/integrations/meta-ads/sync', { from: '2026-11-01', to: '2026-11-01' });
    metaFails = false;
    assert.equal(res.status, 502);
    assert.match(res.body.outcome.message, /Invalid OAuth access token/);
    assert.equal(res.body.runs[0].status, 'failed');
    assert.ok(!JSON.stringify(res.body).includes(TOKEN));
    const audit = (await admin.get('/api/admin/activity?entity=integration')).body;
    assert.ok(!JSON.stringify(audit).includes(TOKEN));
  });
});
