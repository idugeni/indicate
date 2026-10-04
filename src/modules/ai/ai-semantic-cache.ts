import 'server-only';

import { createHash } from 'node:crypto';
import { sql } from 'drizzle-orm';

import type { AiSemanticCache } from '@/modules/ai/ai-service';
import type { AiDb } from '@/modules/ai/ai-types';

/**
 * Exact-match prompt/response cache (not vector similarity).
 *
 * @remarks Hits require the normalized prompt and model name to hash
 * identically; paraphrases never match. Tenancy: a tenant reads global
 * entries plus its own, never another tenant's rows.
 */

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
 * Normalizes a prompt exactly like the service `normalizeCachePrompt`.
 *
 * @param prompt - Raw caller prompt.
 * @returns Trimmed, whitespace-folded, lowercased prompt.
 */
export function normalizeSemanticPrompt(prompt: string): string {
  return prompt.trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Stable key for one (prompt, model) pair: sha256 hex over the normalized
 * prompt and the lowercased model name.
 *
 * @param prompt - Raw caller prompt.
 * @param modelName - Responding model name.
 * @returns 64-char sha256 hex.
 */
export function hashSemanticPrompt(prompt: string, modelName: string): string {
  const normalizedPrompt = normalizeSemanticPrompt(prompt);
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
 * Builds an `AiSemanticCache` over the runtime database port.
 *
 * @param db - Database port; every read is projected and `LIMIT 1`-bounded.
 * @param scope - Binding org; a tenant reads global plus own entries only.
 * @returns Cache honoring the `AiSemanticCache` bound without ever throwing.
 * @remarks Lookup returns at most 1 row, then bumps `hits` with a single
 * arithmetic `UPDATE` (no read-modify-write); store upserts on the unique
 * conflict and trims responses to 8000 chars. Cache failures are swallowed.
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
    store: async (prompt: string, responseText: string, modelName: string, ttlSeconds: number = SEMANTIC_CACHE_TTL_SECONDS) => {
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
