/**
 * CI budget for unbounded database reads.
 *
 * `npm run lint` fails on any `select().from()` with no projection and no
 * bound, so this check answers a different question: has the *number* of
 * column-projected whole-table reads grown, and did the cheapest offenders get
 * fixed? Both are the shape of the 27.94 GB egress incident, and both are
 * invisible to the lint rule once every read carries a projection.
 *
 * The counts come from the same ESLint rule the gate uses, so the two can never
 * disagree about what counts as bounded. A file is in violation when it
 * declares a column projection but never bounds the read with `.limit()`.
 *
 * @remarks Budgets are intentionally at the current measured count, so this
 * fails only on a regression. Lower them as offenders are fixed; never raise
 * one without a recorded reason.
 */

import { readdirSync } from 'node:fs';
import { join, posix, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import dbAccess from '../eslint/db-access.mjs';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..', '..');

/**
 * Whole-set reads each file is allowed to keep, with the reason it is bounded
 * by its own predicates rather than by a row ceiling.
 *
 * @remarks These counts are ratchets, not endorsements. Every entry is a
 * measured offender from the 2026-09-29 egress audit, pinned at today's value
 * so any new projected full read anywhere fails immediately and the existing
 * ones can only be removed, never grown. Lower an entry as its owner fixes it.
 */
const BUDGET = new Map([
  // Dashboard tenant reads. The old whole-tenant `load()` hydration (17
  // tables per GET and per mutation) was split per operation in the 2026-10
  // remediation: six scoped read models (`readConfigurationScope`,
  // `readPublisherScope`, `readEditorialScope`, `readTaxonomyScope`,
  // `readPublisherClaimScope`, `readNetworkArticlesScope`) plus scoped
  // `execute()` that hydrates only the mutation's collections and trips on
  // out-of-scope access. Every chain below carries an `organization_id`
  // predicate and a narrow projection (article bodies are matched in `WHERE`
  // but never selected); growth tables use raw-SQL filters or keyset
  // pagination instead. The chain count rose because reads are now explicit
  // per operation; per-request rows collapsed. Recorded reason for the
  // higher count: hydration split, enforced by
  // `src/data/repos/dashboard-scopes.test.ts`. Lower it again only by
  // deleting chains, never by adding `.limit()` truncation.
  ['src/data/repos/dashboard.ts', 54],
  // Job-scoped fan-out. A job targets at most the publication batch size, so
  // these read one job's targets, never a growing collection.
  ['src/data/repos/publishing/repository.ts', 19],
  // Bounded reference reads: control-plane content, one article's gallery,
  // one user's memberships, one organization's permissions.
  ['src/data/repos/content/queries.ts', 3],
  ['src/data/repos/delivery.ts', 1],
  ['src/data/repos/integrations.ts', 1],
  ['src/data/repos/tenancy/authorization.ts', 1],
  ['src/modules/dashboard/dashboard-dal.ts', 1],
  // Test fixture repository: mirrors the production read shape on purpose.
  ['src/data/repos/publishing/repository.test.ts', 1],
]);

function sourceFiles(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) sourceFiles(full, out);
    else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) out.push(full);
  }
  return out;
}

/**
 * Every `select().from()` that projects columns yet never bounds the read.
 *
 * @param {import('eslint').ESLint} eslint Configured lint instance.
 * @param {string[]} files Absolute source paths to inspect.
 * @returns {Promise<Map<string, string[]>>} Repo-relative path to select chain text.
 */
async function projectedUnbounded(eslint, files) {
  const results = await eslint.lintFiles(files);
  const perFile = new Map();
  for (const file of results) {
    const chains = file.messages
      .filter((message) => message.ruleId === 'db-access/no-whole-set-read')
      .map((message) => message.message.replace(/^Whole-set read: /u, '').split('. ')[0]);
    if (chains.length > 0) perFile.set(relative(ROOT, file.filePath).split(sep).join(posix.sep), chains);
  }
  return perFile;
}

// Reuse the repository config so the TypeScript parser and the lint gate's own
// `no-unbounded-select` error are in force, then add the whole-set rule on top.
// Parsing with a bare config would silently report nothing.
const eslint = new ESLint({
  overrideConfigFile: join(ROOT, 'eslint.config.mjs'),
  cwd: ROOT,
  overrideConfig: [
    {
      files: ['**/*.{ts,tsx}'],
      plugins: { 'db-access': dbAccess },
      rules: { 'db-access/no-whole-set-read': 'error' },
    },
  ],
});
const files = sourceFiles(join(ROOT, 'src'));
const offenders = await projectedUnbounded(eslint, files);

const rows = [];
const unexpected = [];
for (const [file, chains] of [...offenders].sort()) {
  const allowed = BUDGET.get(file);
  if (allowed === undefined) unexpected.push(`${file} (${chains.length})`);
  else rows.push({ file, count: chains.length, allowed, chains });
}

console.log(`file diperiksa        : ${files.length}`);
console.log(`read tak berbatas     : ${offenders.size} berkas`);
for (const row of rows) {
  console.log(`  ${row.file}: ${row.count} (budget ${row.allowed})`);
  for (const chain of row.chains) console.log(`    - ${chain}`);
}

const overBudget = rows.filter((row) => row.count > row.allowed);
if (unexpected.length > 0 || overBudget.length > 0) {
  if (unexpected.length > 0) {
    console.error(`FAIL: projected read tanpa batas di berkas yang tidak diizinkan:`);
    for (const entry of unexpected) console.error(`  - ${entry}`);
  }
  for (const row of overBudget) {
    console.error(`FAIL: ${row.file} melewati budget (${row.count} > ${row.allowed}). Pagination, bukan menaikkan angka.`);
  }
  process.exit(1);
}

console.log('PASS: tidak ada read tanpa batas baru dan budget tidak terlampaui');
