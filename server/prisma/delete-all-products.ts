/* One-off: delete ALL products permanently.
 * Keeps order history valid: OrderItem rows keep their
 * productName/productSku snapshots, only productId is unlinked (SetNull).
 * Reviews + StockMovements for those products are removed (cascade / explicit).
 * Run: node --env-file=.env node_modules/tsx/dist/cli.mjs prisma/delete-all-products.ts
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

async function main() {
  // 1) Backup the SQLite file first
  const dbPath = path.join(__dirname, 'dev.db');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(__dirname, `dev.db.backup-before-product-wipe-${stamp}`);
  if (fs.existsSync(dbPath)) {
    fs.copyFileSync(dbPath, backupPath);
    console.log(`Backup created: ${backupPath}`);
  } else {
    console.log(`No dev.db found at ${dbPath}, skipping backup`);
  }

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

  // 2) Unlink order history so deleting products cannot break orders
  const unlinked = await prisma.orderItem.updateMany({
    where: { productId: { not: null } },
    data: { productId: null },
  });
  console.log(`Unlinked ${unlinked.count} order items (productId -> null, name/sku snapshots kept)`);

  // 3) Unlink purchase items (plain string field, no FK — for cleanliness)
  try {
    const unlinkedPurchases = await prisma.purchaseItem.updateMany({
      where: { productId: { not: null } },
      data: { productId: null },
    });
    console.log(`Unlinked ${unlinkedPurchases.count} purchase items`);
  } catch (e) {
    console.log('PurchaseItem unlink skipped:', (e as Error).message);
  }

  // 4) Clear dependent rows explicitly (also cascade-deleted, but explicit = countable)
  const delReviews = await prisma.review.deleteMany({});
  console.log(`Deleted ${delReviews.count} reviews`);
  const delMovements = await prisma.stockMovement.deleteMany({});
  console.log(`Deleted ${delMovements.count} stock movements`);

  // 5) Delete all products
  const delProducts = await prisma.product.deleteMany({});
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
