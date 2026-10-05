/**
 * CI budget for `ai:*` Redis environment isolation.
 *
 * Every production `ai:*` counter must flow through a namespace-aware
 * factory so staging and production never share budgets, breakers, or
 * chain rotation on one Upstash resource. This check answers two static
 * questions: (1) do all factory call sites pass a namespace, and (2) is
 * the legacy unnamespaced budget twin still free of production importers
 * (reads fall back to it only as transitional compat, writes never go there).
 *
 * Deterministic: plain source text scans, no traffic, no credentials.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

const failures = [];

function source(path) {
  return readFileSync(resolve(ROOT, path), 'utf8');
}

function sourceFiles(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) sourceFiles(full, out);
    else if (/\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

function checkFactoryCalls(path, factory, namespacePattern) {
  const text = source(path);
  const calls = [...text.matchAll(new RegExp(`${factory}\\(\{([^}]*)\\}`, 'g'))];
  for (const call of calls) {
    if (!namespacePattern.test(call[1] ?? '')) {
      failures.push(`${path}: ${factory} without namespace: {${call[1] ?? ''}}`);
    }
  }
  return calls.length;
}

// 1. Production wiring passes the derived namespace.
const aiRoute = 'src/app/api/dashboard/ai/route.ts';
const rateLimitCalls = checkFactoryCalls(aiRoute, 'createAiModelRateLimitStore', /namespace\s*:/);
const gatewayCalls = checkFactoryCalls(aiRoute, 'createVercelGatewayBudgetGuard', /namespace\s*:/);
if (rateLimitCalls === 0) failures.push(`${aiRoute}: no createAiModelRateLimitStore call found`);
if (gatewayCalls === 0) failures.push(`${aiRoute}: no createVercelGatewayBudgetGuard call found`);

// 2. Factories accept a namespace (code contract, not just call sites).
for (const [path, signature] of [
  ['src/modules/ai/ai-rate-limit.ts', 'createAiModelRateLimitStore(config: { readonly url: string; readonly token: string; readonly namespace?'],
  ['src/integrations/ai/gateway/vercel/vercel-gateway.ts', 'createVercelGatewayBudgetGuard(config: { readonly url: string; readonly token: string; readonly namespace?'],
]) {
  if (!source(path).includes(signature)) {
    failures.push(`${path}: factory does not accept an optional namespace`);
  }
}

// 3. Legacy unnamespaced twin stays out of production (test-only compat reference).
{
  const prodImporters = [];
  for (const file of sourceFiles(resolve(ROOT, 'src'))) {
    const text = readFileSync(file, 'utf8');
    if (file.endsWith('src/integrations/ai/ai-budget.ts')) continue;
    if (/\.test\.tsx?$/.test(file)) continue;
    if (text.includes('integrations/ai/ai-budget')) prodImporters.push(file);
  }
  for (const importer of prodImporters) {
    failures.push(`${importer}: imports legacy unnamespaced ai-budget twin`);
  }
}

// 4. No new raw global ai:* writers outside the namespace helper and key builders.
{
  const allowed = new Set([
    'src/modules/ai/ai-redis-namespace.ts',
    'src/modules/ai/ai-rate-limit.ts', // key builders (aiRpmKey/aiTpmKey/quota) + scoped application
    'src/modules/ai/ai-router.ts', // AI_CHAIN_CURSOR_KEY + aiBreakerKey builders, scoped at use
    'src/integrations/ai/gateway/vercel/vercel-gateway.ts', // monthKey builder, scoped at use
    'src/modules/ai/ai-security.ts', // already-namespaced budget guard
    'src/integrations/ai/ai-budget.ts', // legacy twin (see check 3)
  ]);
  for (const file of sourceFiles(resolve(ROOT, 'src'))) {
    if (/\.test\.tsx?$/.test(file)) continue;
    const normalized = relative(ROOT, file).replace(/\\/g, '/');
    if (allowed.has(normalized)) continue;
    const text = readFileSync(file, 'utf8');
    const lines = text.split('\n');
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('*') || trimmed.startsWith('//')) return;
      if (line.includes('`ai:')) {
        failures.push(`unexpected raw ai: key template outside namespace design: ${normalized}:${index + 1}: ${trimmed.slice(0, 100)}`);
      }
    });
  }
}

if (failures.length > 0) {
  console.error('FAIL: redis namespace budget violated:');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log('PASS: ai:* keys flow through namespace-aware factories with legacy-read compat');
