import 'server-only';

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import type { BootstrapConfig } from '@/core/config/bootstrap/bootstrap-schema';
import * as schema from '@/data/schema';

const RUNTIME_DATABASE_OPTIONS = '-c statement_timeout=15000 -c lock_timeout=5000 -c idle_in_transaction_session_timeout=30000';

const DEFAULT_POOL_MAX = 6;
const MAX_POOL_MAX = 20;

/**
 * Ceiling for one pooled read, enforced in the client because the driver has no
 * per-query timeout.
 *
 * @remarks Deliberately above the 15s server-side `statement_timeout`: a read
 * that trips this never reached PostgreSQL, so it is a client-side stall (a
 * queued query on a saturated pool, or a socket that stopped delivering) rather
 * than slow SQL. Without a ceiling such a read never settles, so the Suspense
 * hole it holds open is never closed, the streamed HTML is never terminated,
 * and the visitor watches the tab spin indefinitely instead of seeing a failure.
 */
const QUERY_DEADLINE_MS = 20_000;

function poolMax(fallback: number): number {
  const raw = process.env.DATABASE_POOL_MAX;
  if (raw === undefined || raw.trim() === '') return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_POOL_MAX) return fallback;
  return parsed;
}

function withRuntimeDatabaseOptions(rawUrl: string): string {
  const url = new URL(rawUrl);
  url.searchParams.set('options', RUNTIME_DATABASE_OPTIONS);
  return url.toString();
}

/**
 * Open the pooled runtime database.
 *
 * @param config - Bootstrap configuration providing the pooled URL.
 * @returns Frozen runtime client, database, and closer.
 * @remarks The Supabase transaction pooler multiplexes server connections, but each warm Vercel instance still owns its client pool, and the pool must never be smaller than the largest burst of reads a single request issues. A saturated pool does not merely serialize: postgres.js hands queued queries to an already-busy connection during `onopen`, so with `max: 1` a second concurrent read is never dispatched and stays pending forever — no rejection, and no `statement_timeout`, because the statement never leaves the client. That wedges the warm instance, and every response depending on such a read streams a shell whose Suspense hole never closes, leaving the browser at `readyState: "loading"` and the visitor on a permanent spinner. The control-plane landing page issues three concurrent reads on its own, so the floor is set well above that; `DATABASE_POOL_MAX` raises it further when a surface needs more. Measured headroom is 57 usable connections against 16 in use, of which only two are Supavisor backends, and twelve concurrent queries through the pooler complete normally. Startup options carry the timeout limits through transaction-mode Supavisor, and they are load-bearing: the project default is `statement_timeout` 120000 with `lock_timeout` and `idle_in_transaction_session_timeout` disabled, so dropping the options would widen the statement budget from 15s to 120s.
 */
export function createRuntimeDatabase(config: BootstrapConfig) {
  const client = postgres(withRuntimeDatabaseOptions(config.database.pooledUrl.reveal()), {
    max: poolMax(DEFAULT_POOL_MAX),
    prepare: false,
    ssl: 'require',
    idle_timeout: 20,
    connect_timeout: 10,
    max_lifetime: 60 * 30,
  });
  return Object.freeze({
    client,
    db: drizzle(client, { schema }),
    close: async () => client.end({ timeout: 5 }),
  });
}

const sharedPools = new Map<string, Pick<ReturnType<typeof createRuntimeDatabase>, 'client' | 'db'>>();

/**
 * Process-wide pool keyed by connection URL; never closed by callers so hot
 * paths skip the ~1s TLS handshake per request. Idle connections still
 * self-close via `idle_timeout`. Shape omits `close` so owned-vs-shared
 * misuse fails at compile time.
 */
export function getSharedRuntimeDatabase(config: BootstrapConfig) {
  const key = config.database.pooledUrl.reveal();
  const existing = sharedPools.get(key);
  if (existing !== undefined) return existing;
  const { client, db } = createRuntimeDatabase(config);
  const shared = Object.freeze({ client, db });
  sharedPools.set(key, shared);
  return shared;
}

/**
 * Bound one pooled read so a client-side stall cannot hold a response open
 * forever.
 *
 * @param label - Read identifier used in the rejection message.
 * @param read - Read to run; invoked only after the deadline is armed.
 * @param deadlineMs - Ceiling for the read, defaulting to the client deadline.
 * @returns The read result.
 * @throws {Error} `query_deadline_exceeded` when the read has not settled in time.
 * @remarks The driver offers no per-query timeout, so this is the only bound on
 * a read that never reaches PostgreSQL. Both promises are created inside the
 * call, which keeps the pair inside the caller's own scope — a `use cache` fill
 * rejects a race whose loser was built outside it. A breach releases the caller
 * while the abandoned read stays pending; `max_lifetime` and `idle_timeout`
 * recycle the connection, and the pool floor keeps the next request dispatchable.
 */
export async function withQueryDeadline<T>(label: string, read: () => Promise<T>, deadlineMs = QUERY_DEADLINE_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      read(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`query_deadline_exceeded: ${label} did not settle within ${deadlineMs}ms`));
        }, deadlineMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
