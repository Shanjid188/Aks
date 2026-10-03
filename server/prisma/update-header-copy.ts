// One-off copy sync for the header navigation.
//
// The first item of the department strip was renamed from "All Departments" to
// "All Products" (bundled default lives in src/data/siteContent.ts). A stored
// value in StoreSetting wins over that default, so an existing install keeps
// showing the old wording until this runs (or until the merchant edits
// Admin -> Storefront -> Header / Navigation and saves).
//
// Usage, from the `server` folder:
//   node --env-file=.env node_modules/tsx/dist/cli.mjs prisma/update-header-copy.ts
import { prisma } from '../src/lib/prisma.ts';

const COPY: Record<string, string> = {
  'content.header.allDepartments': 'All Products',
  'content.header.allDepartments.bn': 'সব পণ্য',
};

for (const [key, value] of Object.entries(COPY)) {
  const next = JSON.stringify(value);
  const existing = await prisma.storeSetting.findUnique({ where: { key } });

  if (!existing) {
    console.log(`skip  ${key} (not stored - the bundled default "${value}" already applies)`);
  } else if (existing.value === next) {
    console.log(`ok    ${key} = ${existing.value}`);
  } else {
    await prisma.storeSetting.update({ where: { key }, data: { value: next } });
    console.log(`set   ${key}: ${existing.value} -> ${next}`);
  }
}

await prisma.$disconnect();
