import 'server-only';

import { sql } from 'drizzle-orm';

import { asRecord } from '@/core/guards';
import { decryptAiKey } from '@/modules/ai/ai-crypto';
import type { AiRateLimitStore } from '@/modules/ai/ai-rate-limit';
import type {
  AiAccessChannel,
  AiChainStrategy,
  AiCredentialRecord,
  AiCredentialStatus,
  AiDb,
  AiErrorClass,
  AiRotationStrategy,
  AiRoutingPolicy,
  AiThinkingConfig,
} from '@/modules/ai/ai-types';

/**
 * No static routing policy exists: provider and model resolution is
 * database-driven from `ai_routing_policies`. Callers treat a missing row
 * as unconfigured and report exhaustion instead of inventing a provider.
 */

/**
 * Batas retry untuk panggilan interaktif yang menunggu respons.
 */
export const INTERACTIVE_MAX_RETRIES = 2;

/**
 * Batas retry untuk pekerjaan background tanpa pengguna menunggu.
 */
export const BACKGROUND_MAX_RETRIES = 5;

/**
 * Mode retry berdasarkan urgensi respons.
 */
export type AiRetryMode = 'interactive' | 'background';

/**
 * Resolve batas retry berdasarkan mode panggilan.
 *
 * @param mode - Mode interaktif atau background.
 * @returns Batas retry untuk mode tersebut.
 */
export function resolveMaxRetries(mode: AiRetryMode): number {
  return mode === 'background' ? BACKGROUND_MAX_RETRIES : INTERACTIVE_MAX_RETRIES;
}

/** Full column projection for one credential row, kept explicit for egress review. */
const CREDENTIAL_COLUMNS = sql`id, provider_id, organization_id, label, key_encrypted, key_masked, status, priority, weight, cooldown_until, last_used_at, last_success_at, last_failure_at, last_error_message, last_error_class, total_requests, successful_requests, failed_requests, rate_limit_count, quota_exhausted_count, avg_latency_ms, created_at, updated_at`;

const ERROR_CLASSES: readonly AiErrorClass[] = [
  'auth_failure',
  'invalid_key',
  'rate_limit',
  'quota_exhausted',
  'timeout',
  'network_error',
  'provider_unavailable',
  'malformed_response',
  'model_unavailable',
  'safety_blocked',
  'application_error',
];

const CREDENTIAL_STATUSES: readonly AiCredentialStatus[] = [
  'active',
  'inactive',
  'disabled',
  'exhausted',
  'invalid',
  'cooldown',
];

/** Credential selection scope for one provider lookup. */
export interface AiCredentialScope {
  readonly organizationId?: string | null | undefined;
  readonly limit?: number | undefined;
  readonly now?: Date | undefined;
}

/** Classified provider failure driving retry and cooldown decisions. */
export interface AiClassifiedError {
  readonly errorClass: AiErrorClass;
  readonly isRetryable: boolean;
  readonly message: string;
  /** Parsed `retry_after:<seconds>` hint when the provider supplied one. */
  readonly retryAfterSec?: number | undefined;
}

/** Per-provider round-robin cursors for credential rotation. */
const roundRobinByProvider = new Map<string, number>();

/**
 * Reset the round-robin rotation counters.
 *
 * @remarks Deterministic starting point for tests and freshly booted instances.
 */
export function resetAiRotationState(): void {
  roundRobinByProvider.clear();
}

/**
 * Read the cursor for one rotation scope.
 *
 * @param scope - Provider scope isolating rotation cursors.
 * @returns Current cursor, defaulting to 0.
 */
export function getRoundRobinCursor(scope: string): number {
  return roundRobinByProvider.get(scope) ?? 0;
}

function toStringOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function toNumberOrFallback(value: unknown, fallback: number): number {
  const parsed =
    typeof value === 'string' ? Number(value) : typeof value === 'number' ? value : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toIsoOrNull(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  return null;
}

function toErrorClassOrNull(value: unknown): AiErrorClass | null {
  return typeof value === 'string' && (ERROR_CLASSES as readonly string[]).includes(value)
    ? (value as AiErrorClass)
    : null;
}

function toStatusOrFallback(value: unknown, fallback: AiCredentialStatus): AiCredentialStatus {
  return typeof value === 'string' && (CREDENTIAL_STATUSES as readonly string[]).includes(value)
    ? (value as AiCredentialStatus)
    : fallback;
}

function toCredentialRow(value: unknown): AiCredentialRecord | null {
  const row = asRecord(value);
  if (row === null) return null;
  const id = toStringOrNull(row.id);
  const providerId = toStringOrNull(row.provider_id);
  const keyEncrypted = toStringOrNull(row.key_encrypted);
  const keyMasked = toStringOrNull(row.key_masked);
  if (id === null || providerId === null || keyEncrypted === null || keyMasked === null) return null;
  return {
    id,
    providerId,
    organizationId: toStringOrNull(row.organization_id),
    label: toStringOrNull(row.label) ?? '',
    keyEncrypted,
    keyMasked,
    status: toStatusOrFallback(row.status, 'active'),
    priority: toNumberOrFallback(row.priority, 100),
    weight: toNumberOrFallback(row.weight, 100),
    cooldownUntil: toIsoOrNull(row.cooldown_until),
    lastUsedAt: toIsoOrNull(row.last_used_at),
    lastSuccessAt: toIsoOrNull(row.last_success_at),
    lastFailureAt: toIsoOrNull(row.last_failure_at),
    lastErrorMessage: toStringOrNull(row.last_error_message),
    lastErrorClass: toErrorClassOrNull(row.last_error_class),
    totalRequests: toNumberOrFallback(row.total_requests, 0),
    successfulRequests: toNumberOrFallback(row.successful_requests, 0),
    failedRequests: toNumberOrFallback(row.failed_requests, 0),
    rateLimitCount: toNumberOrFallback(row.rate_limit_count, 0),
    quotaExhaustedCount: toNumberOrFallback(row.quota_exhausted_count, 0),
    avgLatencyMs: toNumberOrFallback(row.avg_latency_ms, 0),
    createdAt: toIsoOrNull(row.created_at) ?? '',
    updatedAt: toIsoOrNull(row.updated_at) ?? '',
  };
}

function toRowArray(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : [];
}

/**
 * Resolve the adaptive thinking budget for one request.
 *
 * @param channel - Access channel driving the default budget.
 * @param userThinkingConfig - Explicit caller override, honoured first.
 * @returns Thinking configuration, or undefined when the adapter default applies.
 */
export function resolveThinkingBudget(
  channel?: AiAccessChannel | undefined,
  userThinkingConfig?: AiThinkingConfig | undefined,
): AiThinkingConfig | undefined {
  if (userThinkingConfig?.thinkingBudget !== undefined) return userThinkingConfig;
  switch (channel) {
    case 'telegram':
      return { thinkingBudget: -1, includeThoughts: true };
    case 'api':
      return { thinkingBudget: 32768, includeThoughts: true };
    case 'web':
    default:
      return { thinkingBudget: -1, includeThoughts: true };
  }
}

/**
 * Tugas yang memiliki anggaran thinking berbeda.
 *
 * @remarks Caption dan SEO hanya butuh penalaran pendek; polish dan
 * ringkas memakai anggaran besar untuk menjaga kualitas hasil.
 */
export type AiThinkingTask = 'caption' | 'seo' | 'polish' | 'summarize';

/**
 * Pemetaan tugas ke anggaran thinking dalam token.
 *
 * @remarks Caption dan SEO kecil agar cepat; polish dan ringkas besar
 * agar hasilnya matang.
 */
export const AI_TASK_THINKING_BUDGET: Record<AiThinkingTask, number> = {
  caption: 1024,
  seo: 2048,
  polish: 8192,
  summarize: 8192,
};

/**
 * Resolve anggaran thinking berdasarkan tugas.
 *
 * @param task - Tugas yang menentukan anggaran default.
 * @param userOverride - Override eksplisit pemanggil, dihormati lebih dulu.
 * @param channel - Kanal akses untuk fallback saat tugas tidak dikenal.
 * @returns Konfigurasi thinking tugas tersebut atau default kanal.
 */
export function resolveTaskThinkingBudget(
  task: AiThinkingTask | (string & {}),
  userOverride?: AiThinkingConfig | undefined,
  channel?: AiAccessChannel | undefined,
): AiThinkingConfig | undefined {
  if (userOverride?.thinkingBudget !== undefined) return userOverride;
  const budget = (AI_TASK_THINKING_BUDGET as Record<string, number>)[task];
  if (typeof budget === 'number') return { thinkingBudget: budget, includeThoughts: true };
  return resolveThinkingBudget(channel, undefined);
}

/**
 * Read the armed routing policy.
 *
 * @param db - Runtime database port.
 * @returns Stored `default` policy, or null when no row is armed or the read fails.
 */
export async function getActiveRoutingPolicy(db: AiDb): Promise<AiRoutingPolicy | null> {
  try {
    const value = await db.execute(
      sql`select id, rotation_strategy, chain_strategy, cost_mode, primary_provider_id, fallback_provider_id, default_model, fallback_model, max_retries, per_key_retry_limit, cooldown_duration_sec, request_timeout_ms, global_concurrency_limit, updated_at from ai_routing_policies where id = 'default' limit 1`,
    );
    const record = asRecord(toRowArray(value)[0]);
    if (record === null) return null;
    const id = toStringOrNull(record.id);
    const defaultModel = toStringOrNull(record.default_model);
    const fallbackModel = toStringOrNull(record.fallback_model);
    if (id === null || defaultModel === null || defaultModel === '' || fallbackModel === null || fallbackModel === '') {
      return null;
    }
    const strategy = toStringOrNull(record.rotation_strategy);
    const chainStrategy = toStringOrNull(record.chain_strategy);
    const costMode = toStringOrNull(record.cost_mode);
    return {
      id,
      rotationStrategy:
        strategy === 'round_robin' ||
        strategy === 'random' ||
        strategy === 'least_used' ||
        strategy === 'lowest_error_rate' ||
        strategy === 'priority_based' ||
        strategy === 'health_aware'
          ? strategy
          : 'health_aware',
      chainStrategy: chainStrategy === 'round_robin' ? chainStrategy : 'fallback',
      costMode: costMode === 'price' ? costMode : 'throughput',
      primaryProviderId: toStringOrNull(record.primary_provider_id),
      fallbackProviderId: toStringOrNull(record.fallback_provider_id),
      defaultModel,
      fallbackModel,
      maxRetries: toNumberOrFallback(record.max_retries, 5),
      perKeyRetryLimit: toNumberOrFallback(
        record.per_key_retry_limit,
        2,
      ),
      cooldownDurationSec: toNumberOrFallback(
        record.cooldown_duration_sec,
        60,
      ),
      requestTimeoutMs: toNumberOrFallback(
        record.request_timeout_ms,
        60000,
      ),
      globalConcurrencyLimit: toNumberOrFallback(
        record.global_concurrency_limit,
        100,
      ),
      updatedAt: toStringOrNull(record.updated_at) ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/**
 * Resolve pemilik katalog satu model modalitas.
 *
 * @param db - Runtime database port.
 * @param modelName - Nama model dari `modelOverride` pemanggil.
 * @returns Provider pemilik dari `ai_models`, atau null bila katalog tidak mengenalnya.
 * @remarks Satu baris berproyeksi dan ber-`LIMIT`; null berarti pemanggil memakai primary.
 */
export async function getModelOwnerProvider(db: AiDb, modelName: string): Promise<string | null> {
  try {
    const value = await db.execute(sql`select provider_id from ai_models where model_name = ${modelName} limit 1`);
    const record = asRecord(toRowArray(value)[0]);
    if (record === null) return null;
    return toStringOrNull(record.provider_id);
  } catch {
    return null;
  }
}

/**
 * Satu langkah dalam rantai failover model.
 */
export interface AiModelChainEntry {
  readonly providerId: string;
  readonly modelName: string;
}

/**
 * Menyusun rantai model primary → fallback untuk satu query.
 *
 * @param policy - Kebijakan routing aktif dari database.
 * @param modelOverride - Model khusus modalitas (sampul, TTS, transkripsi); bila diisi, rantai hanya berisi override tersebut.
 * @param providerOverride - Provider pemilik override dari katalog; bila diisi, override berjalan di provider itu bukan primary.
 * @returns Satu atau dua entri, atau kosong bila primary belum diatur di database.
 * @remarks `fallback_provider_id` yang null dibaca sebagai provider primary, sehingga `fallback_model` yang berbeda tetap menyelamatkan query saat model utama kelebihan beban. Primary null berarti rantai kosong: pemanggil melaporkan exhaustion, bukan menebak provider.
 */
export function resolveAiModelChain(
  policy: AiRoutingPolicy,
  modelOverride?: string | undefined,
  providerOverride?: string | undefined,
): readonly AiModelChainEntry[] {
  const primaryProviderId = policy.primaryProviderId;
  const targetModel = modelOverride ?? policy.defaultModel;
  if (modelOverride !== undefined) {
    const owner = providerOverride ?? primaryProviderId;
    if (owner === null) return [];
    return [{ providerId: owner, modelName: targetModel }];
  }
  if (primaryProviderId === null) return [];
  const fallbackProviderId = policy.fallbackProviderId ?? primaryProviderId;
  if (fallbackProviderId === primaryProviderId && policy.fallbackModel === targetModel) {
    return [{ providerId: primaryProviderId, modelName: targetModel }];
  }
  return [
    { providerId: primaryProviderId, modelName: targetModel },
    { providerId: fallbackProviderId, modelName: policy.fallbackModel },
  ];
}

/** Redis cursor rotating the starting entry of the model chain. */
export const AI_CHAIN_CURSOR_KEY = 'ai:chain:cursor';

/**
 * Memutar urutan rantai dari satu titik awal tanpa mengubah isinya.
 *
 * @param chain - Rantai dasar primary → fallback dari `resolveAiModelChain`.
 * @param startIndex - Titik awal putaran; di luar rentang dinormalkan dengan modulo.
 * @returns Rantai yang sama diputar agar entri awal berbeda tiap request.
 */
export function orderAiModelChain(
  chain: readonly AiModelChainEntry[],
  startIndex: number,
): readonly AiModelChainEntry[] {
  if (chain.length <= 1 || !Number.isFinite(startIndex)) return chain;
  const start = ((Math.floor(startIndex) % chain.length) + chain.length) % chain.length;
  if (start === 0) return chain;
  return [...chain.slice(start), ...chain.slice(0, start)];
}

/**
 * Mengambil dan memajukan cursor putaran rantai model.
 *
 * @param store - Counter Redis; undefined berarti fail-open ke awal rantai.
 * @returns Indeks awal untuk request ini; 0 saat Redis tidak tersedia.
 * @remarks Fail-open: kegagalan Redis menghasilkan urutan fallback, bukan request gagal.
 */
export async function nextChainStartIndex(store: AiRateLimitStore | undefined): Promise<number> {
  if (store === undefined) return 0;
  try {
    const cursor = await store.incrby(AI_CHAIN_CURSOR_KEY, 1);
    return Number.isFinite(cursor) && cursor > 0 ? cursor - 1 : 0;
  } catch {
    return 0;
  }
}

/**
 * Menyusun rantai model sesuai strategi rantai kebijakan.
 *
 * @param policy - Kebijakan routing aktif dari database.
 * @param startIndex - Titik awal putaran; hanya dipakai saat `chainStrategy` round_robin.
 * @param modelOverride - Model khusus modalitas; bila diisi, rantai single tanpa putaran.
 * @param providerOverride - Provider pemilik override dari katalog.
 * @returns Satu atau dua entri; round_robin memutar titik awalnya, fallback memakai urutan tetap.
 */
export function resolveOrderedAiModelChain(
  policy: AiRoutingPolicy,
  startIndex = 0,
  modelOverride?: string | undefined,
  providerOverride?: string | undefined,
): readonly AiModelChainEntry[] {
  const chain = resolveAiModelChain(policy, modelOverride, providerOverride);
  const strategy: AiChainStrategy = policy.chainStrategy ?? 'fallback';
  if (strategy !== 'round_robin' || modelOverride !== undefined) return chain;
  return orderAiModelChain(chain, startIndex);
}

/**
 * Gagal infrastruktur beruntun yang membuka circuit breaker satu model.
 */
export const AI_BREAKER_TRIP_THRESHOLD = 5;

/**
 * Jendela memori kegagalan model; kedaluwarsa berarti half-open.
 */
export const AI_BREAKER_WINDOW_SECONDS = 120;

/**
 * Kelas error yang menandai modelnya (bukan key-nya) sedang bermasalah.
 *
 * @remarks `application_error` dan `malformed_response` ikut dihitung karena
 * 400/respons kosong beruntun adalah sinyal model mati di sisi provider
 * (insiden 2026-10-04: dua model gratis 400 di setiap request tanpa pernah
 * men-trip breaker). Ambang 5 beruntun dalam 120 detik plus reset saat
 * sukses membuat 400 sesekali karena prompt tertentu tidak ikut men-trip.
 */
export const AI_BREAKER_ERROR_CLASSES: readonly AiErrorClass[] = [
  'provider_unavailable',
  'timeout',
  'rate_limit',
  'quota_exhausted',
  'application_error',
  'malformed_response',
];

/**
 * Batas total entri rantai setelah kaskade model sekatalog.
 *
 * @remarks Rantai terkonfigurasi maksimal 2 entri (primary → fallback);
 * kaskade menempelkan model se-provider sampai batas ini agar upaya per
 * query tetap terikat `AI_MAX_TOTAL_ATTEMPTS` dan deadline keseluruhan.
 */
export const AI_MAX_CHAIN_ENTRIES = 4;

/**
 * Rekomendasi tugas yang tidak boleh masuk kaskade teks.
 *
 * @remarks Superset dari daftar lindung sweep: selain modalitas suara,
 * transkripsi, dan embedding, model gambar dan riset otonom juga tidak
 * cocok sebagai lanjutan chat redaksi.
 */
const NON_CHAT_TASKS: ReadonlySet<string> = new Set([
  'tts',
  'speech synthesis',
  'transcribe',
  'transcription',
  'embeddings',
  'image generation',
  'research',
]);

/**
 * List model teks se-provider untuk kaskade turun-model.
 *
 * @param db - Runtime database port.
 * @param providerId - Provider pemilik pool kredensial.
 * @param exclude - Model yang sudah ada di rantai terkonfigurasi.
 * @param limit - Maksimal nama dikembalikan.
 * @returns Nama model aktif berprioritas teratas; kosong saat DB gagal.
 * @remarks Satu `SELECT` berproyeksi dua kolom dan ber-`LIMIT`; gagal
 * berarti tanpa kaskade, bukan request gagal.
 */
export async function getCascadeModels(
  db: AiDb,
  providerId: string,
  exclude: readonly string[],
  limit: number,
): Promise<string[]> {
  if (limit <= 0) return [];
  const capped = Math.min(Math.max(limit, 1), AI_MAX_CHAIN_ENTRIES);
  try {
    const value = await db.execute(
      sql`select model_name, task_recommendation from ai_models where provider_id = ${providerId} and is_active = true order by priority asc limit ${capped * 3}`,
    );
    const out: string[] = [];
    const banned = new Set(exclude);
    for (const row of toRowArray(value)) {
      const record = asRecord(row);
      const name = record === null ? null : toStringOrNull(record.model_name);
      const task = record === null ? null : toStringOrNull(record.task_recommendation);
      if (name === null || banned.has(name)) continue;
      if (task !== null && NON_CHAT_TASKS.has(task)) continue;
      out.push(name);
      banned.add(name);
      if (out.length >= capped) break;
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * Tempelkan model kaskade di belakang entri terkonfigurasi.
 *
 * @param chain - Rantai dasar dari `resolveOrderedAiModelChain`.
 * @param cascades - Nama model per provider dari `getCascadeModels`.
 * @param cap - Batas total entri; default `AI_MAX_CHAIN_ENTRIES`.
 * @returns Rantai bertambah tanpa duplikat dan tanpa melampaui batas.
 * @remarks Kaskade selalu menempel di belakang rantai terkonfigurasi (yang
 * sudah utuh di `out` sejak awal), sehingga pilihan eksplisit operator
 * tidak pernah disalip model sekatalog.
 */
export function expandChainWithCascade(
  chain: readonly AiModelChainEntry[],
  cascades: ReadonlyMap<string, readonly string[]>,
  cap: number = AI_MAX_CHAIN_ENTRIES,
): AiModelChainEntry[] {
  const out = [...chain];
  const seen = new Set(chain.map((entry) => `${entry.providerId}:${entry.modelName}`));
  for (const entry of chain) {
    for (const modelName of cascades.get(entry.providerId) ?? []) {
      if (out.length >= cap) return out;
      const key = `${entry.providerId}:${modelName}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ providerId: entry.providerId, modelName });
    }
  }
  return out;
}

/**
 * Susun rantai penuh: konfigurasi operator plus kaskade sekatalog.
 *
 * @param db - Runtime database port untuk daftar model se-provider.
 * @param chain - Rantai dasar primary → fallback.
 * @param modelOverride - Model khusus modalitas; bila diisi, kaskade
 * dilewati karena override adalah niat satu-model yang eksplisit.
 * @returns Rantai siap coba; pool kredensial tiap entri tetap milik
 * providernya, sehingga turun-model memakai key yang sama.
 */
export async function resolveCascadeChain(
  db: AiDb,
  chain: readonly AiModelChainEntry[],
  modelOverride: string | undefined,
): Promise<readonly AiModelChainEntry[]> {
  if (modelOverride !== undefined) return chain;
  if (chain.length >= AI_MAX_CHAIN_ENTRIES) return chain;
  const room = AI_MAX_CHAIN_ENTRIES - chain.length;
  const configured = chain.map((entry) => entry.modelName);
  const cascades = new Map<string, readonly string[]>();
  for (const entry of chain) {
    if (cascades.has(entry.providerId)) continue;
    cascades.set(entry.providerId, await getCascadeModels(db, entry.providerId, configured, room));
  }
  return expandChainWithCascade(chain, cascades);
}
/**
 * Kunci Redis untuk hitungan gagal satu model.
 *
 * @param providerId - Provider pemilik model.
 * @param modelName - Model yang diputus sementara saat trip.
 * @returns Kunci counter dengan TTL jendela breaker.
 */
export function aiBreakerKey(providerId: string, modelName: string): string {
  return `ai:breaker:${providerId}:${modelName}`;
}

/**
 * Parse a breaker counter with an optional trip timestamp.
 *
 * @param value - Raw store value (`count` or `"count:epochMs"`).
 * @returns Count and trip time (null when untimestamped).
 */
function parseBreakerValue(value: unknown): { readonly count: number; readonly tripAt: number | null } {
  if (typeof value === 'number') {
    return { count: Number.isFinite(value) ? value : 0, tripAt: null };
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const stamped = trimmed.match(/^(\d+):(\d+)$/);
    if (stamped?.[1] !== undefined && stamped[2] !== undefined) {
      return { count: Number.parseInt(stamped[1], 10), tripAt: Number.parseInt(stamped[2], 10) };
    }
    const numeric = Number(trimmed);
    if (Number.isFinite(numeric)) return { count: numeric, tripAt: null };
  }
  return { count: 0, tripAt: null };
}

/**
 * Live breaker counters for one model.
 */
export interface AiModelBreakerState {
  /** True while consecutive infra failures keep the model cut off. */
  readonly tripped: boolean;
  /** Consecutive infra failures counted in the current window. */
  readonly failCount: number;
}

/**
 * Read one model's breaker state from a raw counter value.
 *
 * @param raw - Raw store value (`count` or `"count:epochMs"`).
 * @param nowMs - Clock in epoch ms; defaults to current time.
 * @returns Trip verdict with the consecutive failure count; unknown shapes fail open to healthy.
 */
export function readModelBreakerState(raw: unknown, nowMs: number = Date.now()): AiModelBreakerState {
  const { count, tripAt } = parseBreakerValue(raw);
  if (count < AI_BREAKER_TRIP_THRESHOLD) return { tripped: false, failCount: count };
  if (tripAt !== null && nowMs - tripAt > AI_BREAKER_WINDOW_SECONDS * 1000) {
    return { tripped: false, failCount: count };
  }
  return { tripped: true, failCount: count };
}

/**
 * Check whether one model is temporarily cut off.
 *
 * @param store - Counter Redis; undefined means fail-open (healthy).
 * @param providerId - Model owner provider.
 * @param modelName - Candidate model.
 * @param nowMs - Clock in epoch ms; defaults to current time.
 * @returns True when consecutive failures reach the threshold in-window.
 * @remarks Half-open: a timestamped trip older than the window returns
 * false so exactly one probe passes through.
 */
export async function isModelBreakerTripped(
  store: AiRateLimitStore | undefined,
  providerId: string,
  modelName: string,
  nowMs: number = Date.now(),
): Promise<boolean> {
  if (store === undefined) return false;
  try {
    const raw: unknown = await store.get(aiBreakerKey(providerId, modelName));
    if (raw === null || raw === undefined) return false;
    const { count, tripAt } = parseBreakerValue(raw);
    if (count < AI_BREAKER_TRIP_THRESHOLD) return false;
    if (tripAt !== null && nowMs - tripAt > AI_BREAKER_WINDOW_SECONDS * 1000) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Record one infrastructure failure for a model.
 *
 * @param store - Counter Redis; undefined means skipped.
 * @param providerId - Model owner provider.
 * @param modelName - Failed model.
 * @param nowMs - Clock in epoch ms; defaults to current time.
 * @remarks Stores `"count:epochMs"` via `set` when available so the trip
 * can half-open; otherwise falls back to a plain counter whose TTL expiry
 * still cools the breaker.
 */
export async function recordModelInfraFailure(
  store: AiRateLimitStore | undefined,
  providerId: string,
  modelName: string,
  nowMs: number = Date.now(),
): Promise<void> {
  if (store === undefined) return;
  try {
    const key = aiBreakerKey(providerId, modelName);
    const setter = (store as { readonly set?: unknown }).set;
    if (typeof setter === 'function') {
      let count = 0;
      try {
        const raw: unknown = await store.get(key);
        count = parseBreakerValue(raw).count;
      } catch {
        count = 0;
      }
      await (setter as (key: string, value: string) => Promise<void>).call(store, key, `${count + 1}:${nowMs}`);
    } else {
      await store.incrby(key, 1);
    }
    await store.expire(key, AI_BREAKER_WINDOW_SECONDS);
  } catch {
    /* Breaker tidak boleh menggagalkan jawaban. */
  }
}

/**
 * Tentukan apakah increment terakhir menyeberangi ambang breaker.
 *
 * @param previousCount - Hitungan gagal sebelum increment terakhir.
 * @param threshold - Ambang trip; default AI_BREAKER_TRIP_THRESHOLD.
 * @returns True hanya saat increment terakhir menyeberangi ambang.
 */
export function shouldAlertBreakerTrip(
  previousCount: number,
  threshold: number = AI_BREAKER_TRIP_THRESHOLD,
): boolean {
  if (!Number.isFinite(previousCount) || !Number.isFinite(threshold)) return false;
  return previousCount < threshold && previousCount + 1 >= threshold;
}

/**
 * Cool one model failure count after success.
 *
 * @param store - Counter Redis; undefined means skipped.
 * @param providerId - Model owner provider.
 * @param modelName - Successful model.
 * @remarks DEL semantics via a 1s expiry because the store has no `del`.
 */
export async function recordModelSuccess(
  store: AiRateLimitStore | undefined,
  providerId: string,
  modelName: string,
): Promise<void> {
  if (store === undefined) return;
  try {
    await store.expire(aiBreakerKey(providerId, modelName), 1);
  } catch {
    /* Breaker tidak boleh menggagalkan jawaban. */
  }
}

/**
 * List usable credentials for one provider.
 *
 * @param db - Runtime database port.
 * @param providerId - Provider whose keys are eligible.
 * @param scope - Tenant scope, fetch bound, and clock override.
 * @returns Active credentials ordered by priority then least-recent use.
 * @remarks Expired cooldowns auto-recover first. Tenant scoping always
 * includes shared global keys alongside the tenant's own. Database-only:
 * an empty table yields an empty list, never an environment fallback.
 */
export async function getAvailableCredentials(
  db: AiDb,
  providerId: string,
  scope?: AiCredentialScope | undefined,
): Promise<AiCredentialRecord[]> {
  const nowIso = (scope?.now ?? new Date()).toISOString();
  const limit = Math.min(Math.max(scope?.limit ?? 25, 1), 100);
  const organizationId = scope?.organizationId ?? null;

  try {
    await db.execute(
      sql`update ai_credentials set status = 'active', cooldown_until = null, updated_at = ${nowIso} where provider_id = ${providerId} and status = 'cooldown' and cooldown_until < ${nowIso}`,
    );

    const value =
      organizationId === null
        ? await db.execute(
            sql`select ${CREDENTIAL_COLUMNS} from ai_credentials where provider_id = ${providerId} and status = 'active' and organization_id is null order by priority asc, last_used_at asc limit ${limit}`,
          )
        : await db.execute(
            sql`select ${CREDENTIAL_COLUMNS} from ai_credentials where provider_id = ${providerId} and status = 'active' and (organization_id is null or organization_id = ${organizationId}) order by priority asc, last_used_at asc limit ${limit}`,
          );

    const credentials: AiCredentialRecord[] = [];
    for (const row of toRowArray(value)) {
      const credential = toCredentialRow(row);
      if (credential !== null) credentials.push(credential);
    }
    return credentials;
  } catch {
    return [];
  }
}

function errorRate(credential: AiCredentialRecord): number {
  return credential.totalRequests > 0 ? credential.failedRequests / credential.totalRequests : 0;
}

/**
 * Pick one credential from the eligible set under the active strategy.
 *
 * @param candidates - Eligible credentials, already tenant-scoped and ordered.
 * @param strategy - Rotation strategy; health-aware blends priority, error rate, and volume.
 * @returns Selected credential, or null when the set is empty.
 */
export function selectCredential(
  candidates: readonly AiCredentialRecord[],
  strategy: AiRotationStrategy,
): AiCredentialRecord | null {
  if (candidates.length === 0) return null;

  switch (strategy) {
    case 'round_robin': {
      const scope = candidates[0]?.providerId ?? 'default';
      const cursor = roundRobinByProvider.get(scope) ?? 0;
      const selected = candidates[cursor % candidates.length];
      roundRobinByProvider.set(scope, (cursor + 1) % 1000000);
      return selected ?? null;
    }
    case 'random': {
      const selected = candidates[Math.floor(Math.random() * candidates.length)];
      return selected ?? null;
    }
    case 'least_used': {
      const selected = [...candidates].sort((a, b) => a.totalRequests - b.totalRequests)[0];
      return selected ?? null;
    }
    case 'lowest_error_rate': {
      const selected = [...candidates].sort((a, b) => errorRate(a) - errorRate(b))[0];
      return selected ?? null;
    }
    case 'priority_based': {
      const selected = [...candidates].sort((a, b) => a.priority - b.priority)[0];
      return selected ?? null;
    }
    case 'health_aware':
    default: {
      const selected = [...candidates].sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        const rateA = errorRate(a);
        const rateB = errorRate(b);
        if (rateA !== rateB) return rateA - rateB;
        if (a.avgLatencyMs !== b.avgLatencyMs) return a.avgLatencyMs - b.avgLatencyMs;
        if (a.weight !== b.weight) return b.weight - a.weight;
        return a.totalRequests - b.totalRequests;
      })[0];
      return selected ?? null;
    }
  }
}

/**
 * Classify a provider failure into a routing decision.
 *
 * @param error - Thrown provider or transport error.
 * @returns Stable error class, whether another key may be tried, the message,
 * and the parsed retry hint when present.
 * @remarks HTTP status (`http <code>`) wins first; quota-specific markers
 * precede generic rate signals. Bare codes only count beside error keywords
 * to avoid false positives on free numbers.
 */
export function classifyAiError(error: unknown): AiClassifiedError {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  const retryMatch = lower.match(/retry_after:(\d+)/);
  const retryAfterSec =
    retryMatch?.[1] === undefined ? undefined : Number.parseInt(retryMatch[1], 10);
  const hint =
    retryAfterSec !== undefined && Number.isFinite(retryAfterSec)
      ? { retryAfterSec }
      : {};

  const httpMatch = lower.match(/http\s*[:\-]?\s*(\d{3})/);
  if (httpMatch?.[1] !== undefined) {
    const status = Number.parseInt(httpMatch[1], 10);
    if (status === 429) return { errorClass: 'rate_limit', isRetryable: true, message, ...hint };
    if (status === 401 || status === 403)
      return { errorClass: 'invalid_key', isRetryable: true, message, ...hint };
    if (status >= 500 && status <= 599)
      return { errorClass: 'provider_unavailable', isRetryable: true, message, ...hint };
  }

  if (lower.includes('quota_exhausted') || lower.includes('quotaexhausted')) {
    return { errorClass: 'quota_exhausted', isRetryable: true, message, ...hint };
  }

  if (
    lower.includes('api_key_invalid') ||
    lower.includes('invalid api key') ||
    lower.includes('invalid_key') ||
    lower.includes('unauthenticated')
  ) {
    return { errorClass: 'invalid_key', isRetryable: true, message, ...hint };
  }

  if (
    lower.includes('resource_exhausted') ||
    lower.includes('quota exceeded') ||
    lower.includes('rate limit') ||
    lower.includes('rate_limit') ||
    lower.includes('too many requests')
  ) {
    return { errorClass: 'rate_limit', isRetryable: true, message, ...hint };
  }

  const codeMatch = lower.match(/(?:status|code)\s*[:\-]?\s*(\d{3})/);
  if (codeMatch?.[1] !== undefined) {
    const status = Number.parseInt(codeMatch[1], 10);
    if (status === 429) return { errorClass: 'rate_limit', isRetryable: true, message, ...hint };
    if (status === 401 || status === 403)
      return { errorClass: 'invalid_key', isRetryable: true, message, ...hint };
    if (status >= 500 && status <= 599)
      return { errorClass: 'provider_unavailable', isRetryable: true, message, ...hint };
  }

  const hasErrorContext = /(error|failed|failure|exception|request|response|status|code|http|limit|quota|exhausted|invalid|unauthorized|forbidden|unavailable|timeout|service|server|provider|fetch|api|key|retry|blocked|safety)/.test(
    lower,
  );
  if (hasErrorContext) {
    if (/\b429\b/.test(lower)) return { errorClass: 'rate_limit', isRetryable: true, message, ...hint };
    if (/\b401\b/.test(lower) || /\b403\b/.test(lower))
      return { errorClass: 'invalid_key', isRetryable: true, message, ...hint };
    if (/\b5\d\d\b/.test(lower))
      return { errorClass: 'provider_unavailable', isRetryable: true, message, ...hint };
  }

  if (lower.includes('timeout') || lower.includes('timed out') || lower.includes('deadline exceeded') || lower.includes('aborterror') || lower.includes('aborted')) {
    return { errorClass: 'timeout', isRetryable: true, message, ...hint };
  }

  if (
    lower.includes('econnrefused') ||
    lower.includes('fetch failed') ||
    lower.includes('network error') ||
    lower.includes('unavailable')
  ) {
    return { errorClass: 'provider_unavailable', isRetryable: true, message, ...hint };
  }

  if (lower.includes('safety') || lower.includes('blocked') || lower.includes('content_filter')) {
    return { errorClass: 'safety_blocked', isRetryable: false, message, ...hint };
  }

  return { errorClass: 'application_error', isRetryable: true, message, ...hint };
}

/**
 * Record a successful provider call against one credential.
 *
 * @param db - Runtime database port.
 * @param credentialId - Credential row receiving the success counters.
 * @param latencyMs - Observed provider latency for the moving average.
 * @remarks Single-statement arithmetic `UPDATE`: counters and the running
 * average are derived server-side so no `SELECT` round trip is needed.
 */
export async function recordKeySuccess(
  db: AiDb,
  credentialId: string,
  latencyMs: number,
): Promise<void> {
  try {
    const nowIso = new Date().toISOString();
    const latency = Math.max(0, Math.round(latencyMs));
    await db.execute(
      sql`update ai_credentials set last_used_at = ${nowIso}, last_success_at = ${nowIso}, total_requests = total_requests + 1, successful_requests = successful_requests + 1, avg_latency_ms = case when coalesce(total_requests, 0) <= 0 then ${latency} else cast((coalesce(avg_latency_ms, 0) * total_requests + ${latency}) / (total_requests + 1) as integer) end, updated_at = ${nowIso} where id = ${credentialId}`,
    );
  } catch {
    /* Telemetry must never fail an answer. */
  }
}

/**
 * Record a failed provider call and cool the credential down when warranted.
 *
 * @param db - Runtime database port.
 * @param credentialId - Credential row receiving the failure counters.
 * @param errorClass - Classified failure driving cooldown and status.
 * @param errorMessage - Raw message, truncated to 500 characters server-side.
 * @param cooldownDurationSec - Cooldown window for rate, quota, and invalid-key failures.
 * @remarks Single-statement arithmetic `UPDATE` with no preceding `SELECT`;
 * the default 60s window matches the active routing policy.
 */
export async function recordKeyFailure(
  db: AiDb,
  credentialId: string,
  errorClass: AiErrorClass,
  errorMessage: string,
  cooldownDurationSec = 60,
): Promise<void> {
  try {
    const now = new Date();
    const nowIso = now.toISOString();
    const cooldownUntil =
      errorClass === 'rate_limit' || errorClass === 'quota_exhausted' || errorClass === 'invalid_key'
        ? new Date(now.getTime() + cooldownDurationSec * 1000).toISOString()
        : null;
    const newStatus: AiCredentialStatus =
      errorClass === 'invalid_key' ? 'invalid' : cooldownUntil !== null ? 'cooldown' : 'active';

    await db.execute(
      sql`update ai_credentials set status = ${newStatus}, cooldown_until = ${cooldownUntil}, last_used_at = ${nowIso}, last_failure_at = ${nowIso}, last_error_message = ${errorMessage.slice(0, 500)}, last_error_class = ${errorClass}, total_requests = total_requests + 1, failed_requests = failed_requests + 1, rate_limit_count = rate_limit_count + ${errorClass === 'rate_limit' ? 1 : 0}, quota_exhausted_count = quota_exhausted_count + ${errorClass === 'quota_exhausted' ? 1 : 0}, updated_at = ${nowIso} where id = ${credentialId}`,
    );
  } catch {
    /* Telemetry must never fail an answer. */
  }
}

/**
 * Resolve one usable plaintext key without exposing it beyond the server.
 *
 * @param db - Runtime database port.
 * @param providerId - Provider whose highest-priority credential wins.
 * @param scope - Tenant scope forwarded to credential selection.
 * @returns Plaintext key for the provider adapter, or null when none is usable.
 * @remarks Database-only: no environment fallback exists, so callers must
 * handle null as provider exhaustion rather than retrying another source.
 */
export async function resolveApiKey(
  db: AiDb,
  providerId: string,
  scope?: AiCredentialScope | undefined,
): Promise<string | null> {
  const credentials = await getAvailableCredentials(db, providerId, scope);
  const selected = credentials[0];
  if (selected === undefined) return null;
  const plain = await decryptAiKey(db, selected.keyEncrypted);
  return plain === '' ? null : plain;
}
