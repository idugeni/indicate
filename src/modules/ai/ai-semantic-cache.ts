import 'server-only';

import { createHash } from 'node:crypto';
import { sql } from 'drizzle-orm';

import type { AiSemanticCache } from '@/modules/ai/ai-service';
import type { AiDb } from '@/modules/ai/ai-types';

/** TTL bawaan satu entri cache (24 jam), dipakai bila pemanggil tidak memberi TTL valid. */
export const SEMANTIC_CACHE_TTL_SECONDS = 86400;

/** Batas respons yang disimpan; ai-service hanya memanggil store untuk teks > 20 karakter. */
export const SEMANTIC_CACHE_MAX_RESPONSE_CHARS = 8000;

/** Panjang cuplikan prompt untuk debugging operator; bukan kunci pencocokan. */
export const SEMANTIC_CACHE_PROMPT_PREFIX_CHARS = 300;

/** Plafon TTL agar satu store yang salah tidak mengunci jawaban basi berbulan-bulan. */
const SEMANTIC_CACHE_MAX_TTL_SECONDS = 30 * 86400;

/** Cakupan tenant untuk satu instance cache; `null` membaca/menulis entri global bersama. */
export interface AiSemanticCacheScope {
  readonly organizationId?: string | null | undefined;
  readonly clock?: (() => Date) | undefined;
}

interface CacheRow {
  readonly id: string;
  readonly responseText: string;
  readonly modelName: string;
}

/**
 * Kunci stabil untuk satu (prompt, model): sha256 hex atas prompt yang
 * dinormalisasi (pangkas + lipat whitespace, case dipertahankan) dan nama
 * model yang dilowercase.
 *
 * @param prompt - Prompt mentah pemanggil.
 * @param modelName - Nama model yang menghasilkan respons.
 * @returns Hex sha256 64 karakter.
 */
export function hashSemanticPrompt(prompt: string, modelName: string): string {
  const normalizedPrompt = prompt.trim().replace(/\s+/gu, ' ');
  const normalizedModel = modelName.trim().toLowerCase();
  return createHash('sha256').update(`${normalizedModel}\n${normalizedPrompt}`, 'utf8').digest('hex');
}

function toRowArray(value: unknown): readonly unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'object' && value !== null) {
    const rows = (value as { readonly rows?: unknown }).rows;
    if (Array.isArray(rows)) return rows;
  }
  return [];
}

function toCacheRow(value: unknown): CacheRow | null {
  if (typeof value !== 'object' || value === null) return null;
  const row = value as Record<string, unknown>;
  const id = typeof row.id === 'string' ? row.id : null;
  const responseText = typeof row.response_text === 'string' ? row.response_text : null;
  const modelName = typeof row.model_name === 'string' ? row.model_name : null;
  if (id === null || responseText === null || modelName === null) return null;
  return { id, responseText, modelName };
}

function clampTtl(ttlSeconds: number): number {
  if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) return SEMANTIC_CACHE_TTL_SECONDS;
  return Math.min(Math.floor(ttlSeconds), SEMANTIC_CACHE_MAX_TTL_SECONDS);
}

/**
 * Bangun implementasi `AiSemanticCache` di atas port database runtime.
 *
 * @param db - Port database; setiap baca terproyeksi dan berbatas `LIMIT 1`.
 * @param scope - Organisasi pengikat; tenant membaca entri global + miliknya,
 * tidak pernah milik tenant lain.
 * @returns Cache yang memenuhi batas `AiSemanticCache` tanpa pernah melempar.
 * @remarks Lookup mengembalikan maksimal 1 baris lalu menaikkan `hits`;
 * store melakukan upsert per konflik unik dan memangkas respons ke 8000
 * karakter. Kegagalan cache ditelan agar tidak pernah menggagalkan jawaban.
 */
export function createAiSemanticCache(db: AiDb, scope?: AiSemanticCacheScope | undefined): AiSemanticCache {
  const organizationId = scope?.organizationId ?? null;
  const clock = scope?.clock ?? (() => new Date());
  return {
    lookup: async (prompt: string, modelName: string) => {
      const promptHash = hashSemanticPrompt(prompt, modelName);
      const nowIso = clock().toISOString();
      try {
        const value =
          organizationId === null
            ? await db.execute(
              sql`select id, response_text, model_name from ai_semantic_cache where organization_id is null and model_name = ${modelName} and prompt_hash = ${promptHash} and expires_at > ${nowIso}::timestamptz order by expires_at desc limit 1`,
            )
            : await db.execute(
              sql`select id, response_text, model_name from ai_semantic_cache where (organization_id is null or organization_id = ${organizationId}::uuid) and model_name = ${modelName} and prompt_hash = ${promptHash} and expires_at > ${nowIso}::timestamptz order by expires_at desc limit 1`,
            );
        const row = toCacheRow(toRowArray(value)[0]);
        if (row === null) return null;
        await db
          .execute(sql`update ai_semantic_cache set hits = hits + 1 where id = ${row.id}::uuid`)
          .catch(() => undefined);
        return { responseText: row.responseText, modelName: row.modelName };
      } catch {
        return null;
      }
    },
    store: async (prompt: string, responseText: string, modelName: string, ttlSeconds: number) => {
      const body = responseText.slice(0, SEMANTIC_CACHE_MAX_RESPONSE_CHARS);
      if (body.trim() === '') return;
      const promptHash = hashSemanticPrompt(prompt, modelName);
      const promptPrefix = prompt.trim().replace(/\s+/gu, ' ').slice(0, SEMANTIC_CACHE_PROMPT_PREFIX_CHARS);
      if (promptPrefix === '') return;
      const expiresIso = new Date(clock().getTime() + clampTtl(ttlSeconds) * 1000).toISOString();
      try {
        if (organizationId === null) {
          await db.execute(
            sql`insert into ai_semantic_cache (organization_id, model_name, prompt_hash, prompt_prefix, response_text, hits, expires_at) values (null, ${modelName}, ${promptHash}, ${promptPrefix}, ${body}, 0, ${expiresIso}::timestamptz) on conflict on constraint ai_semantic_cache_org_model_hash_unique do update set prompt_prefix = excluded.prompt_prefix, response_text = excluded.response_text, hits = 0, expires_at = excluded.expires_at`,
          );
        } else {
          await db.execute(
            sql`insert into ai_semantic_cache (organization_id, model_name, prompt_hash, prompt_prefix, response_text, hits, expires_at) values (${organizationId}::uuid, ${modelName}, ${promptHash}, ${promptPrefix}, ${body}, 0, ${expiresIso}::timestamptz) on conflict on constraint ai_semantic_cache_org_model_hash_unique do update set prompt_prefix = excluded.prompt_prefix, response_text = excluded.response_text, hits = 0, expires_at = excluded.expires_at`,
          );
        }
      } catch {
        /* Cache must never fail an answer. */
      }
    },
  };
}
