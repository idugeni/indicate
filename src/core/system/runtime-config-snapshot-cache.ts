import { RUNTIME_CONFIG_SNAPSHOT_TTL_SECONDS } from '@/core/config/runtime/runtime-constants';
import { parsePersistedReadModel, type RuntimeConfigSnapshot } from '@/core/config/persisted/parser';
import type { PersistedRuntimeConfigReadModel } from '@/core/config/persisted/read-model';
import type { RuntimeConfigReadRepository } from '@/modules/persisted-config/ports';
import type { MonotonicClock, MonotonicInstant } from '@/core/system/monotonic-clock';

export interface CacheEntry {
  readonly snapshot: RuntimeConfigSnapshot;
  readonly readAtMonotonic: MonotonicInstant;
  readonly expiresAtMonotonic: MonotonicInstant;
  readonly source: 'postgres';
}

/** Lapis kedua bersama (mis. Redis): kunci mencakup revision sehingga tidak ada bacaan basi. */
export interface SnapshotSharedStore {
  read(environment: string, revision: number): Promise<unknown | null>;
  write(environment: string, revision: number, model: unknown, ttlSeconds: number): Promise<void>;
}

export interface SnapshotStatus {
  readonly configurationVersion: number;
  readonly ageSeconds: number;
  readonly source: 'postgres' | 'validated_cache';
  readonly outcome: 'available' | 'unavailable';
}

/** Bounded in-process snapshot cache: PostgreSQL stays the only authority; single-flight refresh, failed refreshes never extend freshness, expiry yields unavailable (never stale). */
export class RuntimeConfigSnapshotCache {
  readonly #repository: RuntimeConfigReadRepository;
  readonly #clock: MonotonicClock;
  readonly #store: SnapshotSharedStore | null;
  readonly #storeTtlSeconds: number;
  #active: { environment: string; entry: CacheEntry } | null = null;
  #refreshing: { environment: string; promise: Promise<CacheEntry> } | null = null;

  constructor(input: {
    repository: RuntimeConfigReadRepository;
    clock: MonotonicClock;
    ttlSeconds?: number;
    snapshotStore?: SnapshotSharedStore | null;
    snapshotStoreTtlSeconds?: number;
  }) {
    this.#repository = input.repository;
    this.#clock = input.clock;
    this.#store = input.snapshotStore ?? null;
    this.#storeTtlSeconds = input.snapshotStoreTtlSeconds ?? RUNTIME_CONFIG_SNAPSHOT_TTL_SECONDS;
    void input.ttlSeconds;
  }

  async get(environment: string): Promise<CacheEntry> {
    const now = this.#clock.now();
    const active = this.#active;
    if (active !== null && active.environment === environment && active.entry.expiresAtMonotonic.value > now.value) {
      return active.entry;
    }
    return this.refresh(environment);
  }

  private refresh(environment: string): Promise<CacheEntry> {
    const existing = this.#refreshing;
    if (existing !== null && existing.environment === environment) {
      return existing.promise;
    }
    const promise = this.performRefresh(environment).finally(() => {
      this.#refreshing = null;
    });
    this.#refreshing = { environment, promise };
    return promise;
  }

  private async performRefresh(environment: string): Promise<CacheEntry> {
    // Jalur cepat lintas instance: revision murah + model mentah dari lapis bersama,
    // divalidasi parser yang sama sebelum diadopsi. Gagal apa pun → baca penuh.
    if (this.#store !== null) {
      try {
        const { configurationVersion } = await this.#repository.readInventoryVersion(environment);
        const shared = await this.#store.read(environment, configurationVersion);
        if (shared !== null) {
          const sharedParsed = parsePersistedReadModel(shared as PersistedRuntimeConfigReadModel, environment);
          if (sharedParsed.success) return this.adopt(environment, sharedParsed.snapshot);
        }
      } catch {
        /* fall through to full read */
      }
    }
    const read: PersistedRuntimeConfigReadModel = await this.#repository.readComplete(environment);
    const parsed = parsePersistedReadModel(read, environment);
    if (!parsed.success) {
      // Rejected parse keeps the old entry on its original expiry; never adopt a partial value.
      throw new Error('configuration snapshot rejected by parser');
    }
    if (this.#store !== null) {
      await this.#store.write(environment, parsed.snapshot.configurationVersion, read, this.#storeTtlSeconds);
    }
    return this.adopt(environment, parsed.snapshot);
  }

  private adopt(environment: string, snapshot: CacheEntry['snapshot']): CacheEntry {
    const readAt = this.#clock.now();
    const entry: CacheEntry = Object.freeze({
      snapshot: snapshot,
      readAtMonotonic: readAt,
      expiresAtMonotonic: Object.freeze({ value: readAt.value + RUNTIME_CONFIG_SNAPSHOT_TTL_SECONDS }),
      source: 'postgres',
    });
    this.#active = { environment, entry };
    return entry;
  }

  invalidate(intent: { runtimeRevision: number }): void {
    const active = this.#active;
    if (active !== null && intent.runtimeRevision > active.entry.snapshot.configurationVersion) {
      this.#refreshing = null;
      this.#active = null;
    }
  }

  status(environment: string): SnapshotStatus {
    const now = this.#clock.now();
    const active = this.#active;
    if (active === null || active.environment !== environment) {
      return { configurationVersion: 0, ageSeconds: 0, source: 'validated_cache', outcome: 'unavailable' };
    }
    const fresh = active.entry.expiresAtMonotonic.value > now.value;
    const age = Math.max(0, Math.floor(now.value - active.entry.readAtMonotonic.value));
    return {
      configurationVersion: active.entry.snapshot.configurationVersion,
      ageSeconds: age,
      source: fresh ? 'postgres' : 'validated_cache',
      outcome: 'available',
    };
  }
}