import 'server-only';

import { Redis } from '@upstash/redis';

/**
 * Lapis kedua cache snapshot runtime di Redis bersama (bukan per-instance).
 * Kunci mencakup revision sehingga tidak ada bacaan basi menurut konstruksi;
 * kunci kedaluwarsa sendiri. Setiap kegagalan (jaringan, parse, bentuk)
 * mengembalikan null dan pemanggil jatuh kembali ke baca Postgres penuh —
 * tidak pernah mengadopsi nilai parsial.
 */
export class UpstashSnapshotStore {
  private readonly redis: Redis;
  private readonly namespace: string;

  constructor(config: { readonly url: string; readonly token: string; readonly namespace: string }) {
    this.redis = new Redis({ url: config.url, token: config.token });
    this.namespace = config.namespace;
  }

  async read(environment: string, revision: number): Promise<unknown | null> {
    try {
      const raw = await this.redis.get(`${this.namespace}:snapshot:${environment}:v${revision}`);
      if (typeof raw === 'string') return JSON.parse(raw) as unknown;
      if (raw !== null && typeof raw === 'object') return raw;
      return null;
    } catch {
      return null;
    }
  }

  async write(environment: string, revision: number, model: unknown, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.set(`${this.namespace}:snapshot:${environment}:v${revision}`, JSON.stringify(model), { ex: ttlSeconds });
    } catch {
      /* best-effort: kegagalan tulis tidak menggagalkan refresh */
    }
  }
}
