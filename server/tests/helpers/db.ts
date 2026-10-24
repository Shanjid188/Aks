// Throwaway SQLite database for the test suite. Every test file gets its own
// folder in os.tmpdir(), a schema pushed from prisma/schema.prisma, and a small
// set of known fixtures. Nothing here ever touches prisma/dev.db.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

/** server/ — the directory package.json, prisma/ and src/ live in. */
export const SERVER_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const PRISMA_DIR = path.join(SERVER_DIR, 'prisma');
export const DEV_DB_PATH = path.join(PRISMA_DIR, 'dev.db');

/**
 * Resolve a SQLite `file:` URL to an absolute path the way Prisma does:
 * relative paths are relative to the directory holding schema.prisma.
 */
export function resolveSqlitePath(url: string): string {
  if (!url.startsWith('file:')) throw new Error(`Not a SQLite file URL: ${url}`);
  const file = url.slice('file:'.length).split('?')[0];
  return path.resolve(PRISMA_DIR, file);
}

const samePath = (a: string, b: string) =>
  process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b;

/** Refuse to continue if `url` points at the real development database. */
export function assertNotDevDb(url: string): void {
  if (samePath(resolveSqlitePath(url), DEV_DB_PATH)) {
    throw new Error(`Refusing to run tests against ${DEV_DB_PATH}`);
  }
}

export const PASSWORDS = {
  super: 'Super-Test-123',
  staff: 'Staff-Test-123',
} as const;

export const ADMINS = {
  super: { email: 'super@test.local', name: 'Test Super Admin', password: PASSWORDS.super },
  staff: { email: 'staff@test.local', name: 'Test Staff', password: PASSWORDS.staff },
} as const;

export type AdminRole = keyof typeof ADMINS;

/** Permissions held by the limited Staff role. */
export const STAFF_PERMISSIONS = ['dashboard.view', 'orders.view', 'orders.details', 'products.view'];

export const PRODUCTS = [
  { sku: 'TEST-RICE-5KG', slug: 'test-miniket-rice-5kg', name: 'Test Miniket Rice 5kg', category: 'food', subcategory: 'Rice & Staples', price: 450, costPrice: 380, stock: 500 },
  { sku: 'TEST-OIL-1L', slug: 'test-mustard-oil-1l', name: 'Test Mustard Oil 1L', category: 'food', subcategory: 'Oils', price: 280, costPrice: 230, stock: 25 },
  { sku: 'TEST-BASKET', slug: 'test-jute-basket', name: 'Test Jute Basket', category: 'craft', subcategory: 'Baskets', price: 650, costPrice: 400, stock: 10 },
  { sku: 'TEST-POTTERY', slug: 'test-clay-pot', name: 'Test Clay Pot', category: 'craft', subcategory: 'Pottery', price: 1200, costPrice: 700, stock: 20 },
] as const;

export const SHIPPING_ZONES = [
  { id: 'inside_dhaka', label: 'Inside Dhaka', labelBn: 'ঢাকার ভিতরে', fee: 80 },
  { id: 'outside_dhaka', label: 'Outside Dhaka', labelBn: 'ঢাকার বাইরে', fee: 150 },
];

export const FREE_SHIPPING_THRESHOLD = 3000;

export const COUPONS = {
  percent: { code: 'TEST10', discountType: 'percent', value: 10, minSpend: 500 },
  // The checkout treats a percent coupon of 100+ as free delivery (orders.ts).
  freeship: { code: 'FREESHIP', discountType: 'percent', value: 100, minSpend: 0 },
} as const;

export const ORDERS = [
  { orderNumber: 'TEST-1001', trackingCode: 'TRK-TEST-1001', status: 'pending', paymentStatus: 'unpaid' },
  { orderNumber: 'TEST-1002', trackingCode: 'TRK-TEST-1002', status: 'delivered', paymentStatus: 'paid' },
  { orderNumber: 'TEST-1003', trackingCode: 'TRK-TEST-1003', status: 'cancelled', paymentStatus: 'unpaid' },
] as const;

export interface TestDb {
  dir: string;
  url: string;
  cleanup: () => void;
}

/** Create a temp folder, push the schema into a fresh SQLite file and seed it. */
export async function createTestDb(): Promise<TestDb> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aks-test-'));
  const cleanup = () => fs.rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  const url = `file:${path.join(dir, 'test.db').replace(/\\/g, '/')}`;

  try {
    assertNotDevDb(url);
    execFileSync(
      process.execPath,
      [path.join(SERVER_DIR, 'node_modules', 'prisma', 'build', 'index.js'), 'db', 'push', '--skip-generate'],
      { cwd: SERVER_DIR, env: { ...process.env, DATABASE_URL: url }, stdio: 'pipe' }
    );
    await seed(url);
  } catch (err) {
    cleanup();
    throw err;
  }
  return { dir, url, cleanup };
}

async function seed(url: string): Promise<void> {
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    const superRole = await prisma.role.create({
      data: { name: 'Super Admin', isSuper: true, isSystem: true, description: 'Full access' },
    });
    const staffRole = await prisma.role.create({
      data: {
        name: 'Staff',
        description: 'Limited test role',
        permissions: { create: STAFF_PERMISSIONS.map((permission) => ({ permission })) },
      },
    });
    const superAdmin = await prisma.adminUser.create({
      data: {
        email: ADMINS.super.email,
        name: ADMINS.super.name,
        passwordHash: await bcrypt.hash(ADMINS.super.password, 4),
        role: 'super_admin',
        roleId: superRole.id,
      },
    });
    await prisma.adminUser.create({
      data: {
        email: ADMINS.staff.email,
        name: ADMINS.staff.name,
        passwordHash: await bcrypt.hash(ADMINS.staff.password, 4),
        role: 'staff',
        roleId: staffRole.id,
      },
    });

    const categories = [
      { slug: 'food', name: 'SHUDDHO', brand: 'SHUDDHO', subs: ['Rice & Staples', 'Oils'] },
      { slug: 'craft', name: 'AKS CRAFT', brand: 'AKS CRAFT', subs: ['Baskets', 'Pottery'] },
    ];
    for (const [i, c] of categories.entries()) {
      await prisma.category.create({
        data: {
          slug: c.slug,
          name: c.name,
          brand: c.brand,
          sortOrder: i,
          subcategories: {
            create: c.subs.map((name, j) => ({
              name,
              slug: `${c.slug}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
              sortOrder: j,
            })),
          },
        },
      });
    }

    const products = [];
    for (const p of PRODUCTS) {
      const brand = categories.find((c) => c.slug === p.category)!.brand;
      products.push(
        await prisma.product.create({
          data: {
            sku: p.sku,
            slug: p.slug,
            name: p.name,
            brand,
            category: p.category,
            subcategory: p.subcategory,
            description: `${p.name} (test fixture)`,
            price: p.price,
            costPrice: p.costPrice,
            stockQuantity: p.stock,
            lowStockThreshold: 5,
            trackStock: true,
            features: '[]',
            materials: '{}',
            colors: '[]',
            sizes: '[]',
            images: '[]',
            tags: '[]',
            occasion: '',
          },
        })
      );
    }

    await prisma.storeSetting.createMany({
      data: [
        { key: 'shippingZones', value: JSON.stringify(SHIPPING_ZONES) },
        { key: 'freeShippingThreshold', value: JSON.stringify(FREE_SHIPPING_THRESHOLD) },
        { key: 'paymentMethods', value: JSON.stringify(['cod']) },
      ],
    });

    for (const c of Object.values(COUPONS)) {
      await prisma.coupon.create({ data: { ...c, description: `${c.code} (test fixture)` } });
    }

    // Each order: 2 × first product + 1 × second, Inside Dhaka delivery.
    const [a, b] = products;
    const subtotal = a.price * 2 + b.price;
    const shippingFee = SHIPPING_ZONES[0].fee;
    const total = subtotal + shippingFee;
    for (const o of ORDERS) {
      const paid = o.paymentStatus === 'paid';
      await prisma.order.create({
        data: {
          ...o,
          customerName: 'Test Customer',
          customerPhone: '01700000000',
          customerEmail: 'customer@test.local',
          customerAddress: JSON.stringify({ zone: SHIPPING_ZONES[0].id, address: 'House 1, Road 1, Dhaka' }),
          paymentMethod: 'cod',
          subtotal,
          shippingFee,
          total,
          paidAmount: paid ? total : 0,
          dueAmount: paid ? 0 : total,
          assignedAdminId: superAdmin.id,
          items: {
            create: [
              { productId: a.id, productName: a.name, productSku: a.sku, unitCost: a.costPrice, size: '', color: '', quantity: 2, price: a.price },
              { productId: b.id, productName: b.name, productSku: b.sku, unitCost: b.costPrice, size: '', color: '', quantity: 1, price: b.price },
            ],
          },
        },
      });
    }
  } finally {
    await prisma.$disconnect();
  }
}
