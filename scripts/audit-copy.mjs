#!/usr/bin/env node
/**
 * copy-audit — fails when shopper-facing storefront copy is hardcoded.
 *
 * Every string a shopper reads lives in `src/data/siteContent.ts` and is edited
 * in Admin → Storefront → … . This guard keeps that true: English sentences
 * written straight into JSX (or into a title/placeholder/aria-label/en/bn
 * attribute) are reported, and the run fails unless the file is still listed in
 * PENDING below. Shrink PENDING as each file gets migrated — the list is the
 * remaining-work tracker, so it must never grow.
 *
 * Usage:
 *   npm run audit:copy        report findings, exit 1 on new hardcoded copy
 *   npm run audit:copy -- --all   list every finding, always exit 0
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const SRC = join(ROOT, 'src');
const LIST_ALL = process.argv.includes('--all');

/**
 * Files that still render hardcoded copy. Findings here are a warning, not a
 * failure — every entry is a known, tracked piece of remaining work.
 */
const PENDING = new Set([]);

/** TS utility types look like JSX tags to a regex — never copy. */
const NOT_COPY = new Set([
  'Promise', 'Partial', 'Readonly', 'Record', 'Required', 'Omit', 'Pick', 'Array',
]);

/** Copy-free literals that happen to sit in an attribute. */
const SKIP_ATTR = [
  /^\d/, // phone/email/URL examples
  /^[A-Z0-9-]+$/, // 01XXXXXXXXX, AKS-BD-XXXXXX
  /^[\w.+-]+@[\w.-]+$/, // e-mail example
  /^https?:\/\//,
  /^e\.g\. [A-Z0-9]{6,}$/, // e.g. 8N7A2K4LQ9 — a TrxID format hint
];

/**
 * Blank out comments before scanning, keeping newlines so reported line
 * numbers stay true. Usage examples in a doc block are not shipped copy.
 */
const stripComments = (code) =>
  code
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/^[ \t]*\/\/.*$/gm, (m) => m.replace(/[^\n]/g, ' '));

/** Text that carries no English word (prices, punctuation, separators). */
const isCopy = (text) => (text.match(/[A-Za-z]{2,}/g) ?? []).length > 0;

/** Walk every storefront source file and collect findings. */
const walk = (dir, out = []) => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist') continue;
      walk(full, out);
    } else if (entry.endsWith('.tsx')) {
      out.push(full);
    }
  }
  return out;
};

const JSX_TEXT = />\s*([A-Z][^<>{}]{2,}?)\s*</gs;
const ATTR = /\b(title|placeholder|aria-label|alt|en|bn)="([^"]{3,})"/g;

const findings = [];
for (const file of walk(SRC)) {
  const code = stripComments(readFileSync(file, 'utf8'));
  const rel = relative(ROOT, file).split('\\').join('/');
  const lineOf = (index) => code.slice(0, index).split('\n').length;
  const add = (line, text, kind) =>
    findings.push({ file: rel, line, text: text.replace(/\s+/g, ' ').trim(), kind });

  for (const m of code.matchAll(JSX_TEXT)) {
    const text = m[1];
    // `=> Promise<void>` is a TS return type, not JSX text.
    if (code.slice(Math.max(0, m.index - 2), m.index).includes('=')) continue;
    if (NOT_COPY.has(text)) continue;
    if (!isCopy(text)) continue;
    add(lineOf(m.index), text, 'jsx');
  }
  for (const m of code.matchAll(ATTR)) {
    const [, name, value] = m;
    if (SKIP_ATTR.some((re) => re.test(value))) continue;
    if (!value.includes(' ')) continue;
    if (!isCopy(value)) continue;
    add(lineOf(m.index), `${name}="${value}"`, 'attr');
  }
}

const fresh = findings.filter((f) => !PENDING.has(f.file));
const pending = findings.filter((f) => PENDING.has(f.file));

const show = (list) => {
  const byFile = new Map();
  for (const f of list) {
    if (!byFile.has(f.file)) byFile.set(f.file, []);
    byFile.get(f.file).push(f);
  }
  for (const [file, rows] of [...byFile.entries()].sort()) {
    console.log(`\n  ${file}  (${rows.length})`);
    for (const r of rows) console.log(`    ${String(r.line).padStart(4)}  ${r.text}`);
  }
};

if (LIST_ALL) {
  console.log(`Hardcoded storefront copy: ${findings.length} finding(s)\n`);
  show(findings);
  console.log(`\n${pending.length} in PENDING files, ${fresh.length} already-migrated files.`);
  process.exit(0);
}

console.log('copy-audit — shopper-facing copy must come from src/data/siteContent.ts');
console.log(`  pending files (tracked work): ${PENDING.size}`);
console.log(`  findings in those files     : ${pending.length}`);
console.log(`  findings in clean files     : ${fresh.length}`);

if (fresh.length > 0) {
  console.log('\nFAIL — hardcoded copy in files that should already be migrated:');
  show(fresh);
  console.log(
    '\nMove these strings into src/data/siteContent.ts (with their Bangla twins),\n' +
      'add them to a group in admin/src/pages/Storefront.tsx, and render them with\n' +
      'useSiteContent() + useLocalized(). Do not add the file to PENDING.'
  );
  process.exit(1);
}

console.log('\nPASS — no new hardcoded shopper-facing copy.');
