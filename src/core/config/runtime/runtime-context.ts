import 'server-only';

import { getBootstrapConfig } from '@/core/config/bootstrap/bootstrap-config';
import type { BootstrapConfig } from '@/core/config/bootstrap/bootstrap-schema';
import type { RuntimeConfigSnapshot } from '@/core/config/persisted/parser';
import { DrizzleRuntimeConfigRepository } from '@/data/repos/runtime-config/reader';
import { RuntimeConfigSnapshotCache } from '@/core/system/runtime-config-snapshot-cache';
import { HrTimeMonotonicClock } from '@/core/system/monotonic-clock';
import { createRuntimeDatabase } from '@/data/client';
import { getRuntimeConfig } from '@/core/config/runtime/legacy-config';
import type { RuntimeConfig } from '@/core/config/runtime/runtime-schema';

export interface RuntimeContext {
  readonly bootstrap: BootstrapConfig;
  /** Valid DB snapshot; null before migration/backfill completes. */
  readonly snapshot: RuntimeConfigSnapshot | null;
  /** Legacy env-derived config; ignore after cutover. */
  readonly legacy: RuntimeConfig;
  readonly source: 'postgres' | 'legacy';
}

let hydratedPromise: Promise<RuntimeContext> | null = null;

/** Single-flight server runtime context via the bounded cache; callers must honor `source`, never fall back to legacy after cutover. */
export async function getServerRuntimeContext(): Promise<RuntimeContext> {
  if (hydratedPromise === null) {
    hydratedPromise = initializeContext();
  }
  return hydratedPromise;
}

let cache: RuntimeConfigSnapshotCache | null = null;

function legacyFailOpen(bootstrap: BootstrapConfig, legacy: RuntimeConfig): RuntimeContext {
  const context: RuntimeContext = Object.freeze({ bootstrap, snapshot: null, legacy, source: 'legacy' });
  return context;
}

async function initializeContext(): Promise<RuntimeContext> {
  const bootstrap = getBootstrapConfig();
  const legacy = getRuntimeConfig();

  if (cache === null) {
    try {
      const runtime = createRuntimeDatabase(bootstrap);
      const repository = new DrizzleRuntimeConfigRepository(runtime.db);
      cache = new RuntimeConfigSnapshotCache({ repository, clock: new HrTimeMonotonicClock() });
      // Singleton owns the client for the app lifetime (covers 300s refreshes).
      void runtime;
    } catch {
      return legacyFailOpen(bootstrap, legacy);
    }
  }

  try {
    const entry = await cache.get(bootstrap.environment);
    const context: RuntimeContext = Object.freeze({ bootstrap, snapshot: entry.snapshot, legacy, source: 'postgres' });
    return context;
  } catch {
    return legacyFailOpen(bootstrap, legacy);
  }
}

let registerPromise: Promise<RuntimeContext> | null = null;
export function registerServerRuntime(): Promise<RuntimeContext> {
  if (registerPromise === null) {
    registerPromise = getServerRuntimeContext();
  }
  return registerPromise;
}