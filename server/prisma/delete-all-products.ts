/* One-off: delete ALL products permanently.
 * Keeps order history valid: OrderItem rows keep their
 * productName/productSku snapshots, only productId is unlinked (SetNull).
 * Reviews + StockMovements for those products are removed (cascade / explicit).
 *
 * Dry run (counts only, changes nothing):
 *   node --env-file=.env node_modules/tsx/dist/cli.mjs prisma/delete-all-products.ts
 * Delete (backs up the DATABASE_URL file first, aborts if that fails):
 *   node --env-file=.env node_modules/tsx/dist/cli.mjs prisma/delete-all-products.ts --apply
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

/** The SQLite file DATABASE_URL points at (relative paths resolve from prisma/, as Prisma does). */
function databaseFile(): string | null {
  const url = process.env.DATABASE_URL?.trim();
  if (!url || !url.startsWith('file:')) return null;
  return path.resolve(__dirname, url.slice('file:'.length));
}

async function main() {
  const productCount = await prisma.product.count();
  const linkedOrderItems = await prisma.orderItem.count({ where: { productId: { not: null } } });
  const reviewCount = await prisma.review.count();
  const movementCount = await prisma.stockMovement.count();
  const orderCount = await prisma.order.count();
  console.log(`Before: products=${productCount} linkedOrderItems=${linkedOrderItems} reviews=${reviewCount} stockMovements=${movementCount} orders=${orderCount}`);

  if (productCount === 0) {
    console.log('Nothing to delete — product table already empty.');
    return;
  }
  if (!APPLY) {
    console.log('DRY RUN — nothing was changed. Re-run with --apply to delete every product, review and stock movement.');
    return;
  }

  // 1) Back up the database actually in use; never delete without a copy.
  const dbPath = databaseFile();
  if (!dbPath || !fs.existsSync(dbPath)) {
    console.error(`ABORTED — no SQLite file found for DATABASE_URL (${dbPath ?? 'not a file: URL'}), so no backup could be taken.`);
    process.exitCode = 1;
    return;
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `${dbPath}.backup-before-product-wipe-${stamp}`;
  fs.copyFileSync(dbPath, backupPath);
  console.log(`Backup created: ${backupPath}`);

  // 2) Unlink order and purchase history, clear dependent rows, delete products.
  //    One transaction: either everything happens or nothing does.
  const [unlinked, unlinkedPurchases, delReviews, delMovements, delProducts] = await prisma.$transaction([
    prisma.orderItem.updateMany({ where: { productId: { not: null } }, data: { productId: null } }),
    prisma.purchaseItem.updateMany({ where: { productId: { not: null } }, data: { productId: null } }),
    prisma.review.deleteMany({}),
    prisma.stockMovement.deleteMany({}),
    prisma.product.deleteMany({}),
  ]);
  console.log(`Unlinked ${unlinked.count} order items (productId -> null, name/sku snapshots kept)`);
  console.log(`Unlinked ${unlinkedPurchases.count} purchase items`);
  console.log(`Deleted ${delReviews.count} reviews`);
  console.log(`Deleted ${delMovements.count} stock movements`);
  console.log(`Deleted ${delProducts.count} products`);

  const after = await prisma.product.count();
  const ordersAfter = await prisma.order.count();
  const orderItemsAfter = await prisma.orderItem.count();
  console.log(`After: products=${after} orders=${ordersAfter} orderItems=${orderItemsAfter}`);
  console.log(after === 0 ? 'DONE — all products deleted.' : 'WARNING — products remain!');
}

main()
  .catch((e) => {
    console.error('WIPE FAILED:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
