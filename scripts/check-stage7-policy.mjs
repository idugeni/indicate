import { createHash } from 'node:crypto';
import { access, readFile, readdir } from 'node:fs/promises';
import { basename, extname, join, relative, resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const fixture = JSON.parse(await readFile(join(root, 'tests/fixtures/stage1-runtime-environment.json'), 'utf8'));
const configuredRoots = String(process.env.MVP_ROOT_HOSTS ?? fixture.MVP_ROOT_HOSTS ?? '').split(',').map((value) => value.trim().toLowerCase()).filter(Boolean);
const failures = [];
if (configuredRoots.length !== 3 || new Set(configuredRoots).size !== 3) failures.push('Runtime configuration must provide exactly three distinct root hostnames.');

const ignoredDirectories = new Set(['.git', '.next', '.stage7-evidence', 'node_modules', 'playwright-report', 'test-results', 'coverage']);
async function walk(directory) {
  try { await access(directory); } catch { return []; }
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else files.push(path);
  }
  return files;
}

const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.json']);
const executableRoots = [join(root, 'app'), join(root, 'src'), join(root, 'scripts'), join(root, 'deployment')];
const injectedFixtureRoot = process.env.STAGE7_POLICY_FIXTURE_ROOT === undefined ? null : resolve(process.env.STAGE7_POLICY_FIXTURE_ROOT);
if (injectedFixtureRoot !== null) executableRoots.push(injectedFixtureRoot);
const executableFiles = new Set((await Promise.all(executableRoots.map((directory) => walk(directory)))).flat().filter((file) => sourceExtensions.has(extname(file).toLowerCase())));
const self = join(root, 'scripts/check-stage7-policy.mjs');
const policyScanners = new Set([self, join(root, 'scripts/check-deployment-policy.mjs')]);
const allowedProviderFiles = new Set([
  join(root, 'src/infrastructure/cloudflare/cloudflare-authority.ts'),
  join(root, 'src/infrastructure/deployment/production-readiness-adapter.ts'),
  join(root, 'src/infrastructure/vercel/exact-domain-adapter.ts'),
]);
const forbiddenTopology = [
  /create(?:Tenant|Organization)(?:Project|Database|Bucket|Redis|Application|Deployment)\s*\(/iu,
  /per[-_ ]tenant[-_ ](?:project|database|bucket|redis|application|deployment|template)/iu,
  /vercel[^\n]{0,80}(?:nameserver|wildcard).*(?:create|register|transfer|set)/iu,
  /(?:transfer|set|change)[A-Za-z]*(?:Nameserver|NameServer)\s*\(/u,
  /(?:register|create)[A-Za-z]*Wildcard[A-Za-z]*\s*\(/u,
];
const sensitiveNames = [
  'SUPABASE_SERVICE_ROLE_KEY', 'DATABASE_POOL_URL', 'DATABASE_DIRECT_URL', 'CLOUDFLARE_API_TOKEN',
  'CLOUDFLARE_ORIGIN_SECRET', 'VERCEL_API_TOKEN', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY',
  'UPSTASH_REDIS_REST_TOKEN', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_WEBHOOK_SECRET', 'GENERIC_WEBHOOK_SECRET', 'CRON_SECRET',
];
const configuredSecrets = sensitiveNames.map((name) => process.env[name]).filter((value) => typeof value === 'string' && value.length >= 8 && !/sentinel/iu.test(value));
const assignmentPattern = new RegExp(`\\b(?:export\\s+)?(?:${sensitiveNames.join('|')})\\b\\s*[:=]\\s*['"\\x60]?([^'"\\x60\\s#;,}]{8,})`, 'giu');
const sourceAssignmentPattern = new RegExp(`\\b(?:export\\s+)?(?:${sensitiveNames.join('|')})\\b\\s*[:=]\\s*(['"\\x60])([^'"\\x60\\r\\n]{8,})\\1`, 'giu');
const productionCredentialPatterns = [
  /-----BEGIN (?:ENCRYPTED |RSA |EC |OPENSSH )?PRIVATE KEY-----/u,
  /\bAKIA[0-9A-Z]{16}\b/u,
  /\b(?:sk_live_|rk_live_)[A-Za-z0-9]{16,}\b/u,
  /\bghp_[A-Za-z0-9]{30,}\b/u,
  /\bgithub_pat_[A-Za-z0-9_]{40,}\b/u,
  /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/u,
];
const sentinelValue = (value) => /(?:sentinel|placeholder|example|replace|not[-_ ]?secret)/iu.test(value);

for (const file of executableFiles) {
  if (policyScanners.has(file)) continue;
  const content = await readFile(file, 'utf8').catch(() => '');
  for (const hostname of configuredRoots) if (content.toLowerCase().includes(hostname)) failures.push(`${relative(root, file)} hardcodes a configured runtime root hostname.`);
  for (const pattern of forbiddenTopology) if (pattern.test(content)) failures.push(`${relative(root, file)} contains a prohibited tenant-specific or authority-changing operation.`);
  if (!allowedProviderFiles.has(file) && /https:\/\/(?:api\.vercel\.com|api\.cloudflare\.com)/u.test(content)) failures.push(`${relative(root, file)} accesses a control-plane provider outside a reviewed adapter.`);
  for (const match of content.matchAll(sourceAssignmentPattern)) if (!sentinelValue(match[2] ?? '')) failures.push(`${relative(root, file)} assigns plaintext to a production-sensitive configuration name.`);
}

const contract = JSON.parse(await readFile(join(root, 'deployment/stage1-contract.json'), 'utf8'));
const oneValues = [contract.application?.codebases, contract.application?.nextApplications, contract.application?.publicTemplates, contract.resources?.vercelProjects, contract.resources?.supabaseProjects, contract.resources?.supabaseDatabases, contract.resources?.supabaseAuthInstances, contract.resources?.r2Buckets, contract.resources?.upstashRedisResources];
if (!oneValues.every((value) => value === 1) || contract.resources?.perTenantResources !== false || contract.application?.tenantSpecificBuilds !== false) failures.push('Deployment contract does not preserve one shared topology.');
if (contract.cloudflare?.authoritativeNameservers !== true || contract.cloudflare?.authoritativeDns !== true || contract.cloudflare?.authoritativeWildcardDns !== true || contract.cloudflare?.authoritativeSslProxy !== true || contract.cloudflare?.authoritativeCdn !== true) failures.push('Deployment contract does not preserve complete Cloudflare authority.');
if (contract.vercel?.hostingOnly !== true || contract.vercel?.domainAssociation !== 'exact_only' || contract.vercel?.nameserverTransferAllowed !== false || contract.vercel?.wildcardRegistrationAllowed !== false) failures.push('Deployment contract grants a prohibited Vercel responsibility.');

const fixtureSecretsValid = fixture.NODE_ENV === 'test' && sensitiveNames.every((name) => typeof fixture[name] === 'string' && fixture[name].includes('sentinel'));
if (!fixtureSecretsValid) failures.push('The committed runtime fixture must contain test-only sentinel credentials, never production-looking plaintext credentials.');

const negativeFixtureRoot = join(root, 'tests/fixtures/policy/stage7');
const reviewedSyntheticFixtures = new Map([
  ['env/.env.production', '20e6dd36a7b85e8f4eb3986279f03db5896dd291726edae1106aec3c8f2e3762'],
  ['envrc/.envrc', '27806f0396079f3a43b01a885036cea08b0df675e64c4d74bea32e7358daf151'],
  ['hardcoded-secret.ts', '33899af9efec45ae85ad03e00338f79c06f0343f8d923599c35dd960388a6c6f'],
  ['ini/leaked.ini', '4c0899e305b6a2e38f3a08c2a6c8eb596a945e7ff7c5d19e6b5eb7ddd68d1426'],
  ['jks/leaked.jks', '2492b1e5082a8e787792e661e79e5021e1452d002ff51ba5a1f0fe6751c2e997'],
  ['key/leaked.key', '94e79a96cdccfb641bc833befbbf9f95e9dca9014e07d0e344162878b3eeccfe'],
  ['markdown/leaked.md', '59405b12ba7eb8578e704fe943ce4b4fbc134575bd58cd44398c5e5dfd61dc34'],
  ['p12/leaked.p12', 'feaa8601a09c70e9420bfcbc4ecb0f05b38100045c6a772e831e9b6281d13741'],
  ['pem/leaked.pem', '962020b944cf54f1f1103a834b3175bda17773a33ea429eee567b83494e49341'],
  ['pfx/leaked.pfx', '01d92848cc65c67efa449da0253d65ea3d1db8dde3f9e1f83c7dce393dd4a2fc'],
  ['properties/leaked.properties', '643193d457a4e6144b48022eb7e9af266003ffc3b5ff85cc110ada327a2bfd01'],
  ['shell/leaked.sh', 'd5920bc3264107c651458fdd98c25bb8cfc20ea396546e572c29a1b6b5658489'],
  ['source/leaked.tsx', 'db87c8e1b5b82c1d8d824222afa6bdecc7abe5413f375f7e4432bc22ac1f763f'],
  ['tfvars/leaked.tfvars', '915d7f5efc8175f0e8f84516c82cc5318d432f826d88ac10d53d6666538e1061'],
  ['toml/leaked.toml', '4dc5cdec9d3dd22a01c29db71f6990c2ce1bbf92eb1550bf3ea67abcf1a6c0e4'],
]);
const allRepositoryFiles = await walk(root);
const injectedFiles = injectedFixtureRoot === null ? [] : await walk(injectedFixtureRoot);
const filesToScan = new Set([...allRepositoryFiles, ...injectedFiles]);
const textExtensions = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.json', '.txt', '.log', '.yml', '.yaml', '.md', '.sh', '.bash', '.zsh', '.pem', '.key', '.p12', '.pfx', '.jks', '.tfvars', '.toml', '.ini', '.properties']);
for (const file of filesToScan) {
  const reviewedPath = file.startsWith(`${negativeFixtureRoot}/`) ? relative(negativeFixtureRoot, file).replaceAll('\\', '/') : null;
  const reviewedDigest = reviewedPath === null ? undefined : reviewedSyntheticFixtures.get(reviewedPath);
  if (reviewedDigest !== undefined && !injectedFiles.includes(file)) {
    const reviewedContent = await readFile(file);
    const digest = createHash('sha256').update(reviewedContent).digest('hex');
    if (digest === reviewedDigest && reviewedContent.toString('utf8').includes('STAGE7_REVIEWED_SYNTHETIC_SECRET_FIXTURE')) continue;
    failures.push(`${relative(root, file)} no longer matches its exact reviewed synthetic fixture allowance.`);
  }
  const name = basename(file).toLowerCase();
  const extension = extname(file).toLowerCase();
  const isEnvironment = name === '.env' || name === '.envrc' || name.startsWith('.env.');
  if (extension === '.log') failures.push(`${relative(root, file)} is a transient log artifact and must not be committed or retained.`);
  if (!isEnvironment && !textExtensions.has(extension)) continue;
  if (['.p12', '.pfx', '.jks'].includes(extension)) failures.push(`${relative(root, file)} is a committed private key-store artifact.`);
  const content = await readFile(file, 'utf8').catch(() => '');
  if (productionCredentialPatterns.some((pattern) => pattern.test(content))) failures.push(`${relative(root, file)} contains production-looking credential material.`);
  if (isEnvironment || ['.sh', '.bash', '.zsh', '.pem', '.key', '.p12', '.pfx', '.jks', '.tfvars', '.toml', '.ini', '.properties'].includes(extension) || injectedFiles.includes(file)) {
    for (const match of content.matchAll(assignmentPattern)) if (!sentinelValue(match[1] ?? '')) failures.push(`${relative(root, file)} assigns plaintext to a production-sensitive configuration name.`);
  }
  for (const secret of configuredSecrets) if (content.includes(secret)) failures.push(`${relative(root, file)} contains a configured production secret value.`);
}

if (failures.length > 0) {
  console.error([...new Set(failures)].sort().join('\n'));
  process.exit(1);
}
console.log('Stage 7 topology, runtime-host hardcoding, provider-authority, artifact, and secret-boundary policy passed.');
