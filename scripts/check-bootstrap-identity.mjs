/**
 * Check whether a set of database URLs will satisfy the bootstrap project-identity
 * guard, without needing a database connection.
 *
 * Setting `SUPABASE_PROJECT_REF` makes that guard live, and the guard is
 * fail-closed: a mismatch stops the application from booting. That makes the
 * value worth proving before it reaches a deployment, and the values it reads
 * are the ones the Vercel API will not hand back — both database URLs are
 * `visibility: secret`, so they can only be read by a human from the dashboard.
 *
 * This script therefore takes the URLs as input and prints the verdict per
 * field, using the same code path the application uses at boot. It never prints
 * a password: only the username, host, port, and database.
 *
 * Usage:
 *   npm run check:bootstrap-identity -- \
 *     --ref cmqipmerhfpfqoeasibs \
 *     --supabase-url https://cmqipmerhfpfqoeasibs.supabase.co \
 *     --pool postgresql://indicate_runtime.<ref>:<password>@<pooler>:6543/postgres \
 *     --direct postgresql://postgres.<ref>:<password>@<pooler>:5432/postgres
 *
 * Or read the same variables from a `.env`-style file:
 *   npm run check:bootstrap-identity -- --env .env.production
 *
 * Exit code is 0 when the guard would pass and 1 when it would refuse.
 */
import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);

function flag(name) {
  const index = args.indexOf(`--${name}`);
  return index < 0 ? undefined : args[index + 1];
}

function fail(message) {
  console.error(`check-bootstrap-identity: ${message}`);
  process.exit(2);
}

function fromEnvFile(path) {
  const values = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index < 0) continue;
    const key = trimmed.slice(0, index).trim();
    if (values[key] === undefined) values[key] = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, '');
  }
  return values;
}

const envFile = flag('env');
const fromFile = envFile === undefined ? {} : fromEnvFile(envFile);
const ref = flag('ref') ?? fromFile.SUPABASE_PROJECT_REF;
const supabaseUrl = flag('supabase-url') ?? fromFile.NEXT_PUBLIC_SUPABASE_URL;
const poolUrl = flag('pool') ?? fromFile.DATABASE_POOL_URL;
const directUrl = flag('direct') ?? fromFile.DATABASE_DIRECT_URL;

if (ref === undefined) fail('missing --ref (or SUPABASE_PROJECT_REF in --env)');
if (poolUrl === undefined || directUrl === undefined) fail('missing --pool and/or --direct (or the matching keys in --env)');

const POOLER_SUFFIX = '.pooler.supabase.com';
const TENANT_USER = /^[A-Za-z0-9_][A-Za-z0-9_-]*\.(.+)$/;

/**
 * Mirror of the guard in `src/core/config/bootstrap/bootstrap-schema.ts`.
 *
 * @param {string} value - Raw `postgresql://` URL.
 * @param {string} projectRef - Project ref every URL must agree with.
 * @returns {{ ok: boolean, shape: string, why: string }} Verdict plus a redacted shape.
 */
function check(value, projectRef) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return { ok: false, shape: '<unparseable>', why: 'not a parseable URL' };
  }
  const shape = `${url.username}@${url.hostname}:${url.port || '5432'}${url.pathname}`;
  if (url.protocol !== 'postgresql:') return { ok: false, shape, why: `protocol is ${url.protocol}, expected postgresql:` };
  if (url.hostname === `db.${projectRef}.supabase.co`) return { ok: true, shape, why: 'per-project direct host' };
  if (!url.hostname.endsWith(POOLER_SUFFIX)) return { ok: false, shape, why: `host is neither db.${projectRef}.supabase.co nor *${POOLER_SUFFIX}` };
  const tenant = TENANT_USER.exec(decodeURIComponent(url.username));
  if (tenant === null) return { ok: false, shape, why: `pooler username must be <user>.${projectRef}` };
  if (tenant[1] !== projectRef) return { ok: false, shape, why: `pooler username carries ref ${tenant[1]}, expected ${projectRef}` };
  return { ok: true, shape, why: 'pooler host with ref in username' };
}

console.log(`project ref: ${ref}`);
if (supabaseUrl !== undefined) {
  const host = new URL(supabaseUrl).hostname;
  const ok = host === `${ref}.supabase.co`;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} NEXT_PUBLIC_SUPABASE_URL host ${host} (expected ${ref}.supabase.co)`);
  if (!ok) process.exitCode = 1;
}

let allOk = (process.exitCode ?? 0) === 0;
for (const [label, value] of [['DATABASE_POOL_URL', poolUrl], ['DATABASE_DIRECT_URL', directUrl]]) {
  const verdict = check(value, ref);
  if (!verdict.ok) allOk = false;
  console.log(`  ${verdict.ok ? 'ok  ' : 'FAIL'} ${label} ${verdict.shape} — ${verdict.why}`);
}

console.log(allOk ? 'bootstrap identity guard would pass.' : 'bootstrap identity guard would REFUSE; the application would fail closed on the next deploy.');
process.exit(allOk ? 0 : 1);
