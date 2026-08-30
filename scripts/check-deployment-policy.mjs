import { access, readdir, readFile } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const contract = JSON.parse(await readFile(new URL('../deployment/stage1-contract.json', import.meta.url), 'utf8'));
const expectedOnes = [
  ['application.codebases', contract.application.codebases],
  ['application.nextApplications', contract.application.nextApplications],
  ['application.publicTemplates', contract.application.publicTemplates],
  ['resources.vercelProjects', contract.resources.vercelProjects],
  ['resources.supabaseProjects', contract.resources.supabaseProjects],
  ['resources.supabaseDatabases', contract.resources.supabaseDatabases],
  ['resources.supabaseAuthInstances', contract.resources.supabaseAuthInstances],
  ['resources.r2Buckets', contract.resources.r2Buckets],
  ['resources.upstashRedisResources', contract.resources.upstashRedisResources],
];
const violations = expectedOnes.filter(([, value]) => value !== 1).map(([path]) => `${path} must equal 1`);

for (const [path, value] of [
  ['application.tenantSpecificBuilds', contract.application.tenantSpecificBuilds],
  ['resources.perTenantResources', contract.resources.perTenantResources],
  ['vercel.nameserverTransferAllowed', contract.vercel.nameserverTransferAllowed],
  ['vercel.wildcardRegistrationAllowed', contract.vercel.wildcardRegistrationAllowed],
]) {
  if (value !== false) violations.push(`${path} must be false`);
}
for (const [path, value] of [
  ['cloudflare.authoritativeNameservers', contract.cloudflare.authoritativeNameservers],
  ['cloudflare.authoritativeDns', contract.cloudflare.authoritativeDns],
  ['cloudflare.authoritativeWildcardDns', contract.cloudflare.authoritativeWildcardDns],
  ['cloudflare.authoritativeSslProxy', contract.cloudflare.authoritativeSslProxy],
  ['cloudflare.authoritativeCdn', contract.cloudflare.authoritativeCdn],
  ['vercel.hostingOnly', contract.vercel.hostingOnly],
]) {
  if (value !== true) violations.push(`${path} must be true`);
}
if (contract.vercel.domainAssociation !== 'exact_only') violations.push('vercel.domainAssociation must be exact_only');

async function walk(directory) {
  try { await access(directory); } catch { return []; }
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else if (new Set(['.ts', '.tsx', '.js', '.mjs', '.fixture']).has(extname(path))) files.push(path);
  }
  return files;
}

const executableRoots = [join(root, 'src', 'infrastructure'), join(root, 'app'), join(root, 'scripts')];
if (process.env.DEPLOYMENT_POLICY_FIXTURE_ROOT) executableRoots.push(resolve(process.env.DEPLOYMENT_POLICY_FIXTURE_ROOT));
const prohibitedOperations = [
  /\b(?:register|create|associate)(?:Vercel)?Wildcard(?:Domain|Registration)?\s*\(/i,
  /\b(?:set|change|transfer)(?:Vercel)?Nameservers?\s*\(/i,
  /\bcreate(?:Tenant|Organization)(?:Project|Database|Bucket|Redis|Application|Deployment)\s*\(/i,
  /\.(?:projects|databases|buckets|redis)\.create\s*\(/i,
  /\.domains\.(?:add|create)\s*\(\s*['"`]\*/i,
  /\b(?:createProject|createDatabase|createBucket|createRedis)\s*\(/i,
];
const approvedVercelAdapter = join(root, 'src', 'infrastructure', 'vercel', 'exact-domain-adapter.ts');
for (const file of (await Promise.all(executableRoots.map(walk))).flat()) {
  if (file === join(root, 'scripts', 'check-deployment-policy.mjs')) continue;
  const content = await readFile(file, 'utf8');
  if (file !== approvedVercelAdapter && /api\.vercel\.com|@vercel\/(?:sdk|client)/i.test(content)) {
    violations.push(`${relative(root, file)} accesses Vercel outside the reviewed exact-domain adapter`);
  }
  if (/nameservers?|wildcard/i.test(content) && /api\.vercel\.com|@vercel\/|\.domains\./i.test(content)) {
    violations.push(`${relative(root, file)} combines a forbidden Vercel capability with executable provider access`);
  }
  for (const pattern of prohibitedOperations) {
    if (pattern.test(content)) violations.push(`${relative(root, file)} contains a prohibited infrastructure operation`);
  }
}

const vercelPort = await readFile(new URL('../src/ports/vercel-domain.ts', import.meta.url), 'utf8');
if (/nameserver|wildcard/i.test(vercelPort)) violations.push('Vercel port exposes a nameserver or wildcard operation');

if (violations.length > 0) {
  console.error([...new Set(violations)].sort().join('\n'));
  process.exit(1);
}
console.log('Deployment topology policy passed: executable paths preserve one shared topology, Cloudflare authority, and Vercel exact-domain hosting only.');
