/**
 * CI budget for duplicated expensive work.
 *
 * One logical commit should trigger the minimum necessary CI: this check
 * pins the deduplications so a well-meaning workflow edit cannot silently
 * reintroduce a second link crawl, a second db-access scan, or an extra
 * dependency install per gate run.
 *
 * Deterministic: plain text scans of the two gate workflows, no runners.
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const failures = [];

function workflow(name) {
  return readFileSync(resolve(ROOT, '.github', 'workflows', name), 'utf8');
}

const quality = workflow('quality-gate.yml');
const docs = workflow('docs-gate.yml');

function count(text, literal) {
  return text.split(literal).length - 1;
}

// 1. Link crawl runs exactly once per SHA: docs-gate owns lychee because it
// triggers on every **/*.md change (mixed PRs included) plus the schedule.
const lycheeTotal = count(quality, 'lycheeverse/lychee-action') + count(docs, 'lycheeverse/lychee-action');
if (lycheeTotal !== 1) {
  failures.push(`lychee-action runs ${lycheeTotal}x across gates (budget: 1, owner: docs-gate)`);
}
if (count(quality, 'lycheeverse/lychee-action') !== 0) {
  failures.push('quality-gate must not run lychee (docs-gate covers every md change)');
}

// 2. db-access budget scans once: `npm run perf` already includes it.
const dbAccessRuns = count(quality, 'perf:db-access');
if (dbAccessRuns !== 1) {
  failures.push(`perf:db-access referenced ${dbAccessRuns}x in quality-gate (budget: 1, via npm run perf)`);
}

// 3. Dependency installs stay at the measured floor: 6 jobs in quality-gate
// (static/lint/test/build/perf/docs) + 1 in docs-gate. Test shards share one
// job definition (matrix), so 4 shards still cost one install line.
const npmCiTotal = count(quality, 'run: npm ci') + count(docs, 'run: npm ci');
if (npmCiTotal !== 7) {
  failures.push(`npm ci runs ${npmCiTotal}x across gates (budget: 7; lower by sharing installs, never raise silently)`);
}

// 4. npm cache stays enabled everywhere node runs.
const cacheTotal = count(quality, 'cache: npm') + count(docs, 'cache: npm');
if (cacheTotal < 7) {
  failures.push(`cache: npm present ${cacheTotal}x (budget floor: 7)`);
}

// 5. Required checks keep their aggregator contract.
if (!quality.includes('needs: [static, lint, test, perf, build, docs]')) {
  failures.push('quality-gate aggregator must still require all six jobs');
}

if (failures.length > 0) {
  console.error('FAIL: CI duplication budget violated:');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log('PASS: one logical commit triggers minimum necessary CI work');
