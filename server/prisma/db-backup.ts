/**
 * Timestamped backup of the SQLite database.
 *
 * The production database is NOT in git (server/prisma/dev.db is ignored), so
 * every server keeps its own copy and `git pull` never touches the data. That
 * is why production can silently drift away from local — the code syncs, the
 * data does not.
 *
 * Take a backup before replacing or resetting the database. The file name
 * matches the existing `server/prisma/dev.db.backup-*` ignore rule, so backups
 * are never committed by accident.
 *
 *   cd server && npm run db:backup
 *
 * Backups land next to the database as dev.db.backup-<YYYYMMDD-HHMMSS>.
 * To restore, stop the app and copy the chosen file back over dev.db.
 */
import path from 'node:path';
import fs from 'node:fs';

function resolveDbFile(): string | null {
  const url = process.env.DATABASE_URL?.trim();
  if (!url || !url.startsWith('file:')) return null;
  const rel = url.slice('file:'.length).replace(/^\.\//, '');
  const abs = path.resolve(process.cwd(), 'prisma', rel);
  return fs.existsSync(abs) ? abs : null;
}

function main() {
  const dbFile = resolveDbFile();
  if (!dbFile) {
    console.log('ℹ️  DATABASE_URL is not a file: URL or the database is missing — nothing to back up.');
    return;
  }

  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
  const backup = `${dbFile}.backup-${stamp}`;

  fs.copyFileSync(dbFile, backup);
  const kb = Math.round(fs.statSync(backup).size / 1024);
  console.log(`✅ Backed up ${dbFile}`);
  console.log(`   → ${backup} (${kb} KB)`);
  console.log('   Restore: stop the app, then copy that file back over dev.db.');
}

try {
  main();
} catch (err) {
  console.error('❌ Backup failed:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
}