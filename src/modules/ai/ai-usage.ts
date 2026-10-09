import 'server-only';

import { executeAiQuery, type AiServiceDeps } from '@/modules/ai/ai-service';
import {
  ARTICLE_DRAFT_SCHEMA,
  COVER_CAPTION_SCHEMA,
  MODERATION_ANALYSIS_SCHEMA,
  TAG_SUGGESTION_SCHEMA,
  VISION_DRAFT_SCHEMA,
} from '@/modules/ai/ai-response-schemas';
import { taskThinkingOverride, type AiTaskKind } from '@/modules/ai/ai-task-profiles';
import type { AiCallerRole, AiChatImage, AiThinkingConfig } from '@/modules/ai/ai-types';
import { slugify } from '@/modules/site/slugify';
import { SEO_METADATA_GATEWAY_PROVIDER, SEO_METADATA_MODEL } from '@/modules/ai/ai-task-models';

export const BUSY_MESSAGE = 'Layanan AI sedang sibuk. Silakan coba lagi.';

let configured: AiServiceDeps | null = null;

export const AI_LIMITS = {
  topic: 300,
  points: 2000,
  title: 200,
  body: 8000,
  details: 4000,
  context: 4000,
  base64: 7_000_000,
} as const;

const SECRET_PATTERNS: readonly RegExp[] = [
  /sk-[a-z0-9]{8,}/i,
  /AKIA[0-9A-Z]{12,}/,
  /xox[bap]-[a-z0-9-]{8,}/i,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /whsec_[a-z0-9_-]{8,}/i,
  /AIza[0-9A-Za-z_-]{10,}/,
];

/**
 * Mengikat service bantuan dasbor ke control plane AI paralel.
 *
 * @param deps - Batas database, budget, dan adapter dari rute API.
 */
export function configureAiUsage(deps: AiServiceDeps): void {
  configured = deps;
}

/**
 * Memeriksa prompt sebelum dikirim ke model.
 *
 * @param prompt - Prompt kandidat yang akan dikirim.
 * @returns Prompt yang sama bila lolos; pesan blokir bila mengandung rahasia.
 */
export function scanPrompt(prompt: string): { readonly ok: true } | { readonly ok: false; readonly reason: string } {
  if (prompt.trim() === '') return { ok: false, reason: 'Prompt kosong.' };
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(prompt)) return { ok: false, reason: 'Prompt mengandung materi mirip rahasia dan ditolak.' };
  }
  return { ok: true };
}

/**
 * Memotong input ke batas aman.
 *
 * @param value - Teks mentah dari pemanggil.
 * @param max - Batas karakter.
 * @returns Teks terpangkas.
 */
export function truncateInput(value: string, max: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max).trimEnd()}…`;
}

/**
 * Menghapus pagar kode markdown dari output model.
 *
 * @param text - Output mentah model.
 * @returns Teks siap parse.
 */
export function stripCodeFence(text: string): string {
  return text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
}

export interface ArticleDraft {
  readonly title: string;
  readonly excerpt: string;
  readonly content: string;
  readonly slug: string;
}

/**
 * Mengurai draf artikel JSON dari model dengan fallback aman.
 *
 * @param text - Output mentah model.
 * @param fallbackTopic - Topik asal bila judul model kosong.
 * @returns Draf artikel; null bila tidak bisa diurai.
 */
export function parseArticleDraft(text: string, fallbackTopic: string): ArticleDraft | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFence(text)) as unknown;
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const record = parsed as Record<string, unknown>;
  const title = typeof record.title === 'string' && record.title.trim() !== '' ? record.title.trim().slice(0, 160) : fallbackTopic.trim().slice(0, 160);
  if (title === '') return null;
  const excerpt = typeof record.excerpt === 'string' ? record.excerpt.trim().slice(0, 400) : '';
  const content = typeof record.content === 'string' ? record.content.trim().slice(0, 20000) : '';
  const slugSource = typeof record.slug_suggestion === 'string' && record.slug_suggestion.trim() !== ''
    ? record.slug_suggestion
    : typeof record.slug === 'string' && record.slug.trim() !== '' ? record.slug : title;
  return { title, excerpt, content, slug: slugify(slugSource).slice(0, 120) };
}

export interface TagSuggestion {
  readonly tags: readonly string[];
  readonly category: string | null;
}

/**
 * Mengurai saran tag/kategori JSON dari model.
 *
 * @param text - Output mentah model.
 * @returns Daftar tag ternormalisasi; null bila unparseable.
 */
export function parseTagSuggestion(text: string): TagSuggestion | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFence(text)) as unknown;
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const record = parsed as Record<string, unknown>;
  const rawTags = Array.isArray(record.tags) ? record.tags : Array.isArray(record.saran_tag) ? record.saran_tag : [];
  const tags = rawTags
    .filter((item): item is string => typeof item === 'string' && item.trim() !== '')
    .map((item) => slugify(item.trim()).slice(0, 60))
    .filter((item) => item !== '')
    .slice(0, 8);
  const category = typeof record.category === 'string' && record.category.trim() !== ''
    ? record.category.trim().slice(0, 120)
    : typeof record.suggestedCategory === 'string' && record.suggestedCategory.trim() !== ''
      ? record.suggestedCategory.trim().slice(0, 120)
      : null;
  if (tags.length === 0 && category === null) return null;
  return { tags, category };
}

export interface ModerationAnalysis {
  readonly summary: string;
  readonly suggestedPriority: string;
  readonly riskLevel: string;
  readonly keywords: readonly string[];
  readonly recommendation: string;
}

/**
 * Mengurai analisis moderasi JSON dari model.
 *
 * @param text - Output mentah model.
 * @returns Analisis dengan bahasa dugaan; null bila unparseable.
 */
export function parseModerationAnalysis(text: string): ModerationAnalysis | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFence(text)) as unknown;
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const record = parsed as Record<string, unknown>;
  const summary = typeof record.summary === 'string' ? record.summary.trim().slice(0, 800) : '';
  if (summary === '') return null;
  const pick = (value: unknown, fallback: string): string => typeof value === 'string' && value.trim() !== '' ? value.trim().slice(0, 40) : fallback;
  const keywords = Array.isArray(record.keywords) ? record.keywords.filter((item): item is string => typeof item === 'string').map((item) => item.trim().slice(0, 60)).filter((item) => item !== '').slice(0, 10) : [];
  const recommendation = typeof record.recommendation === 'string' ? record.recommendation.trim().slice(0, 1200) : '';
  return {
    summary,
    suggestedPriority: pick(record.suggested_priority ?? record.suggestedPriority, 'normal'),
    riskLevel: pick(record.risk_level ?? record.riskLevel, 'sedang'),
    keywords,
    recommendation,
  };
}

/**
 * Run one guarded staff query with secret scan and task thinking budget.
 *
 * @param callerRole - Caller role for audit and guardrails.
 * @param organizationId - Organization scoping credentials and audit.
 * @param query - Prompt, generation controls, and optional task media.
 * @returns Text plus inline media when requested, or a safe busy message.
 */
export async function runQuery(callerRole: AiCallerRole, organizationId: string | undefined, query: {
  readonly prompt: string;
  readonly systemInstruction: string;
  readonly temperature: number;
  readonly maxOutputTokens: number;
  readonly thinkingTask?: AiTaskKind | (string & {}) | undefined;
  readonly thinkingConfig?: AiThinkingConfig | undefined;
  readonly responseMimeType?: string;
  readonly responseSchema?: Record<string, unknown> | undefined;
  readonly images?: readonly AiChatImage[] | undefined;
  readonly audio?: readonly { readonly base64: string; readonly mimeType: string }[] | undefined;
  readonly modelOverride?: string | undefined;
  readonly responseModalities?: readonly ('TEXT' | 'IMAGE' | 'AUDIO')[] | undefined;
  readonly speechVoiceName?: string | undefined;
  readonly skipSemanticCache?: boolean | undefined;
  readonly requireModelOwner?: boolean | undefined;
  readonly gatewayOnlyProviders?: readonly string[] | undefined;
}): Promise<{ readonly ok: true; readonly text: string; readonly inlineData?: readonly { readonly mimeType: string; readonly base64: string }[] } | { readonly ok: false; readonly error: string }> {
  const scanned = scanPrompt(query.prompt);
  if (!scanned.ok) return { ok: false, error: scanned.reason };
  if (configured === null) return { ok: false, error: BUSY_MESSAGE };
  const thinkingConfig = query.thinkingConfig
    ?? (query.thinkingTask === undefined ? undefined : taskThinkingOverride(query.thinkingTask));
  const result = await executeAiQuery(configured, {
    prompt: query.prompt,
    organizationId: organizationId ?? null,
    systemInstruction: query.systemInstruction,
    temperature: query.temperature,
    maxOutputTokens: query.maxOutputTokens,
    responseMimeType: query.responseMimeType,
    ...(query.responseSchema === undefined ? {} : { responseSchema: query.responseSchema }),
    ...(thinkingConfig === undefined ? {} : { thinkingConfig }),
    channel: 'web',
    callerRole,
    enableTools: false,
    ...(query.images === undefined ? {} : { images: [...query.images] }),
    ...(query.audio === undefined ? {} : { audio: [...query.audio] }),
    ...(query.modelOverride === undefined ? {} : { modelOverride: query.modelOverride }),
    ...(query.skipSemanticCache === undefined ? {} : { skipSemanticCache: query.skipSemanticCache }),
    ...(query.requireModelOwner === undefined ? {} : { requireModelOwner: query.requireModelOwner }),
    ...(query.gatewayOnlyProviders === undefined ? {} : { gatewayOnlyProviders: [...query.gatewayOnlyProviders] }),
    ...(query.responseModalities === undefined ? {} : { responseModalities: [...query.responseModalities] }),
    ...(query.speechVoiceName === undefined ? {} : { speechVoiceName: query.speechVoiceName }),
  });
  if (result.error !== undefined || (result.text.trim() === '' && (result.inlineData?.length ?? 0) === 0)) return { ok: false, error: BUSY_MESSAGE };
  return {
    ok: true,
    text: result.text,
    ...(result.inlineData === undefined || result.inlineData.length === 0 ? {} : { inlineData: result.inlineData }),
  };
}

const DRAFT_SYSTEM = [
  'Kamu adalah jurnalis redaksi jaringan media multi-portal Indonesia.',
  'Tulis formal, faktual, tanpa clickbait, tanpa mengarang angka, nama, atau kutipan.',
  'Gunakan placeholder [Nama, Jabatan] bila kutipan dibutuhkan.',
  'Keluarkan JSON murni tanpa pagar kode:',
  '{"title":"...","excerpt":"...","content":"...","slug_suggestion":"..."}',
].join('\n');

const TAG_SYSTEM = [
  'Kamu adalah editor taksonomi jaringan media Indonesia.',
  'Sarankan satu kategori yang paling sesuai dan 5-8 kata kunci yang relevan untuk dijadikan hashtag redaksi.',
  'Nilai tags harus berupa slug lowercase dengan tanda hubung, tanpa karakter #; pilih kata kunci faktual yang spesifik, bukan kata umum atau berulang.',
  'Jangan mengarang portal atau angka. Keluarkan JSON murni:',
  '{"tags":["..."],"category":"..."}',
].join('\n');

const MODERATION_SYSTEM = [
  'Kamu adalah analis moderasi laporan konten publik.',
  'Gunakan bahasa dugaan ("dugaan", "indikasi"); jangan menyatakan bersalah.',
  'Jangan menyertakan data pribadi pelapor di ringkasan.',
  'Jangan mengarang angka SLA; tulis "sesuai SLA yang berlaku" bila tidak diberikan.',
  'Keluarkan JSON murni:',
  '{"summary":"...","suggested_priority":"low|normal|high|urgent","risk_level":"rendah|sedang|tinggi|kritis","keywords":[],"recommendation":"..."}',
].join('\n');

const REPLY_SYSTEM = [
  'Kamu adalah petugas moderasi yang menulis draf tanggapan resmi berbahasa Indonesia formal dan empatis.',
  'Sapa "Yth. Bapak/Ibu Pelapor", akui laporan dengan serius, jelaskan tindak lanjut tanpa janji yang tidak bisa ditepati.',
  'Jangan menyebut nama atau kontak pelapor. Maksimal 300 kata. Teks biasa tanpa markdown.',
].join('\n');

const INSIGHT_SYSTEM = [
  'Kamu adalah analis redaksi yang merangkum angka yang DIBERIKAN menjadi narasi singkat.',
  'Jangan membuat angka baru, jangan mengklaim sumber yang tidak disebut, jangan memprediksi.',
  'Sebutkan bahwa angka berasal dari ringkasan dasbor yang diberikan. Teks biasa tanpa markdown berat.',
].join('\n');

const VISION_SYSTEM = [
  'Kamu adalah jurnalis redaksi jaringan media multi-portal Indonesia.',
  'Baca gambar dokumen, surat kedinasan, siaran pers, atau foto kegiatan yang dilampirkan dan ekstrak menjadi draf berita formal, faktual, tanpa clickbait.',
  'Jangan mengarang angka, nama, atau kutipan; gunakan placeholder [Nama, Jabatan] bila kutipan dibutuhkan.',
  'Keluarkan JSON murni tanpa pagar kode:',
  '{"title":"...","slug":"...","excerpt":"...","content":"...","tags":["..."],"suggestedCategory":"...","alt":"...","caption":"..."}',
].join('\n');

const VISION_MIME_ALLOWLIST: ReadonlySet<string> = new Set(['image/jpeg', 'image/png', 'image/webp']);

/**
 * Validates and builds one draft-article request shared by the JSON and stream paths.
 *
 * @param topic - Raw topic from the caller.
 * @param points - Raw supporting points from the caller.
 * @returns Truncated topic, points, and model prompt, or a safe refusal message.
 */
export function buildDraftArticleInput(topic: string, points?: string): {
  readonly ok: true;
  readonly topic: string;
  readonly points: string;
  readonly prompt: string;
  readonly systemInstruction: string;
} | { readonly ok: false; readonly error: string } {
  const normalizedTopic = truncateInput(topic, AI_LIMITS.topic);
  if (normalizedTopic.length < 5) return { ok: false, error: 'Topik minimal 5 karakter.' };
  const normalizedPoints = truncateInput(points ?? '', AI_LIMITS.points);
  return {
    ok: true,
    topic: normalizedTopic,
    points: normalizedPoints,
    prompt: `Buatkan naskah berita dari topik dan poin berikut:\n\nTopik: ${normalizedTopic}\n\nPoin utama:\n${normalizedPoints === '' ? '(Kembangkan dari topik)' : normalizedPoints}`,
    systemInstruction: DRAFT_SYSTEM,
  };
}

/**
 * Membuat draf artikel dari topik dan poin redaksi.
 *
 * @param input.topic - Topik minimal 5 karakter.
 * @param input.points - Poin pendukung opsional.
 * @param input.organizationId - Organisasi untuk cakupan kredensial dan audit.
 * @returns Draf artikel atau pesan sibuk yang aman.
 */
export async function generateArticleDraft(input: { readonly topic: string; readonly points?: string; readonly organizationId?: string }): Promise<{ readonly ok: true; readonly draft: ArticleDraft } | { readonly ok: false; readonly error: string }> {
  const built = buildDraftArticleInput(input.topic, input.points);
  if (!built.ok) return built;
  const result = await runQuery('editor', input.organizationId, {
    prompt: built.prompt,
    systemInstruction: built.systemInstruction, temperature: 0.7, maxOutputTokens: 2048, responseMimeType: 'application/json',
    responseSchema: ARTICLE_DRAFT_SCHEMA, thinkingTask: 'summarize',
  });
  if (!result.ok) return result;
  const draft = parseArticleDraft(result.text, built.topic);
  if (draft === null) return { ok: false, error: BUSY_MESSAGE };
  return { ok: true, draft };
}

/**
 * Menyarankan tag dan kategori dari judul dan isi.
 *
 * @param input.title - Judul artikel.
 * @param input.body - Isi artikel terpangkas.
 * @param input.organizationId - Organisasi untuk cakupan kredensial dan audit.
 * @returns Saran tag atau pesan sibuk yang aman.
 */
export async function suggestTags(input: { readonly title: string; readonly body: string; readonly organizationId?: string }): Promise<{ readonly ok: true; readonly suggestion: TagSuggestion } | { readonly ok: false; readonly error: string }> {
  const title = truncateInput(input.title, AI_LIMITS.title);
  const body = truncateInput(input.body, AI_LIMITS.body);
  if (title === '' && body === '') return { ok: false, error: 'Judul atau isi diperlukan.' };
  const result = await runQuery('editor', input.organizationId, {
    prompt: `Sarankan tag dan kategori untuk artikel berikut:\n\nJudul: ${title}\n\nIsi:\n${body}`,
    systemInstruction: TAG_SYSTEM, temperature: 0.3, maxOutputTokens: 512, responseMimeType: 'application/json',
    responseSchema: TAG_SUGGESTION_SCHEMA, thinkingTask: 'seo',
    modelOverride: SEO_METADATA_MODEL, requireModelOwner: true, skipSemanticCache: true,
    gatewayOnlyProviders: [SEO_METADATA_GATEWAY_PROVIDER],
  });
  if (!result.ok) return result;
  const suggestion = parseTagSuggestion(result.text);
  if (suggestion === null) return { ok: false, error: BUSY_MESSAGE };
  return { ok: true, suggestion };
}

/**
 * Meringkas laporan moderasi tanpa data pribadi pelapor.
 *
 * @param input.category - Kategori laporan.
 * @param input.details - Uraian laporan terpangkas; kontak pelapor tidak boleh masuk.
 * @param input.organizationId - Organisasi untuk cakupan kredensial dan audit.
 * @returns Analisis risiko dan prioritas atau pesan sibuk.
 */
export async function summarizeReport(input: { readonly category: string; readonly details: string; readonly organizationId?: string }): Promise<{ readonly ok: true; readonly analysis: ModerationAnalysis } | { readonly ok: false; readonly error: string }> {
  const category = truncateInput(input.category, 80);
  const details = truncateInput(input.details, AI_LIMITS.details);
  if (details === '') return { ok: false, error: 'Uraian laporan diperlukan.' };
  const result = await runQuery('admin', input.organizationId, {
    prompt: `Analisis laporan konten berikut (kontak pelapor sengaja tidak disertakan):\n\nKategori: ${category === '' ? 'Lainnya' : category}\n\nUraian:\n${details}`,
    systemInstruction: MODERATION_SYSTEM, temperature: 0.3, maxOutputTokens: 1024, responseMimeType: 'application/json',
    responseSchema: MODERATION_ANALYSIS_SCHEMA, thinkingTask: 'summarize',
  });
  if (!result.ok) return result;
  const analysis = parseModerationAnalysis(result.text);
  if (analysis === null) return { ok: false, error: BUSY_MESSAGE };
  return { ok: true, analysis };
}

/**
 * Membuat draf tanggapan moderasi yang empatis.
 *
 * @param input.context - Konteks laporan tanpa identitas pelapor.
 * @param input.organizationId - Organisasi untuk cakupan kredensial dan audit.
 * @returns Draf tanggapan atau pesan sibuk.
 */
export async function draftModerationReply(input: { readonly context: string; readonly organizationId?: string }): Promise<{ readonly ok: true; readonly draft: string } | { readonly ok: false; readonly error: string }> {
  const context = truncateInput(input.context, AI_LIMITS.context);
  if (context.length < 10) return { ok: false, error: 'Konteks laporan minimal 10 karakter.' };
  const result = await runQuery('admin', input.organizationId, {
    prompt: `Buatkan draf tanggapan resmi untuk laporan berikut (tanpa menyebut identitas pelapor):\n\n${context}`,
    systemInstruction: REPLY_SYSTEM, temperature: 0.7, maxOutputTokens: 1024, thinkingTask: 'chat',
  });
  if (!result.ok) return result;
  const draft = result.text.trim().slice(0, 2500);
  if (draft === '') return { ok: false, error: BUSY_MESSAGE };
  return { ok: true, draft };
}

const COVER_CAPTION_SYSTEM = [
  'Kamu adalah editor foto redaksi media Indonesia.',
  'Tulis teks alt dan keterangan foto dalam Bahasa Indonesia berdasarkan gambar sampul yang dilampirkan.',
  'Alt: satu kalimat faktual yang mendeskripsikan isi visual untuk pembaca tunanetra; tanpa clickbait, tanpa mengarang nama, angka, atau peristiwa di luar yang terlihat.',
  'Caption: satu kalimat keterangan foto yang layak tampil di bawah gambar; boleh memakai konteks judul artikel bila diberikan.',
  'Keluarkan JSON murni tanpa pagar kode:',
  '{"alt":"...","caption":"..."}',
].join('\n');

export interface CoverCaption {
  readonly alt: string;
  readonly caption: string;
}

/**
 * Mengurai alt dan caption sampul dari model dengan fallback aman.
 *
 * @param text - Output mentah model.
 * @returns Alt dan caption ternormalisasi; null bila keduanya kosong.
 */
export function parseCoverCaption(text: string): CoverCaption | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFence(text)) as unknown;
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const record = parsed as Record<string, unknown>;
  const alt = typeof record.alt === 'string' ? record.alt.trim().slice(0, 200) : '';
  const caption = typeof record.caption === 'string' ? record.caption.trim().slice(0, 200) : '';
  if (alt === '' && caption === '') return null;
  return { alt, caption };
}

/**
 * Menyusun teks alt dan caption untuk gambar sampul yang sudah diunggah.
 *
 * @param input.base64 - Gambar base64, dibatasi 7 juta karakter.
 * @param input.mimeType - Tipe MIME gambar; hanya JPEG, PNG, dan WebP.
 * @param input.title - Judul artikel sebagai konteks opsional.
 * @param input.organizationId - Organisasi untuk cakupan kredensial dan audit.
 * @returns Alt dan caption dari model, atau pesan galat yang aman.
 */
export async function ocCoverCaption(input: { readonly base64: string; readonly mimeType: string; readonly title?: string; readonly organizationId?: string }): Promise<{ readonly ok: true; readonly caption: CoverCaption } | { readonly ok: false; readonly error: string }> {
  const compact = input.base64.replace(/^data:image\/[a-z0-9.+-]+;base64,/i, '');
  if (compact === '' || compact.length > AI_LIMITS.base64) return { ok: false, error: 'Berkas gambar terlalu besar atau kosong.' };
  const mimeType = input.mimeType.trim().toLowerCase();
  if (!VISION_MIME_ALLOWLIST.has(mimeType)) return { ok: false, error: 'Format gambar belum didukung. Gunakan JPEG, PNG, atau WebP.' };
  if (!/^[A-Za-z0-9+/=\s]+$/.test(compact)) return { ok: false, error: 'Berkas gambar tidak valid.' };
  const title = truncateInput(input.title ?? '', 200);
  if (title !== '') {
    const scanned = scanPrompt(title);
    if (!scanned.ok) return { ok: false, error: scanned.reason };
  }
  const result = await runQuery('editor', input.organizationId, {
    prompt: title === '' ? 'Deskripsikan gambar sampul terlampir untuk teks alt dan keterangan foto.' : `Deskripsikan gambar sampul terlampir untuk teks alt dan keterangan foto.\n\nJudul artikel:\n${title}`,
    systemInstruction: COVER_CAPTION_SYSTEM, temperature: 0.3, maxOutputTokens: 256, responseMimeType: 'application/json',
    responseSchema: COVER_CAPTION_SCHEMA, thinkingTask: 'caption',
    images: [{ base64: compact, mimeType }],
  });
  if (!result.ok) return result;
  const caption = parseCoverCaption(result.text);
  if (caption === null) return { ok: false, error: BUSY_MESSAGE };
  return { ok: true, caption };
}

export interface VisionDraft {
  readonly title: string;
  readonly slug: string;
  readonly excerpt: string;
  readonly content: string;
  readonly tags: readonly string[];
  readonly alt: string;
  readonly caption: string;
}

/**
 * Mengurai draf visual JSON dari model dengan fallback aman.
 *
 * @param text - Output mentah model.
 * @returns Draf visual ternormalisasi; null bila judul atau isi kosong.
 */
export function parseVisionDraft(text: string): VisionDraft | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFence(text)) as unknown;
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const record = parsed as Record<string, unknown>;
  const title = typeof record.title === 'string' ? record.title.trim().slice(0, 160) : '';
  const content = typeof record.content === 'string' ? record.content.trim().slice(0, 20000) : '';
  if (title === '' || content === '') return null;
  const excerpt = typeof record.excerpt === 'string' ? record.excerpt.trim().slice(0, 400) : '';
  const slugSource = typeof record.slug === 'string' && record.slug.trim() !== '' ? record.slug : title;
  const rawTags = Array.isArray(record.tags) ? record.tags : [];
  const tags = rawTags
    .filter((item): item is string => typeof item === 'string' && item.trim() !== '')
    .map((item) => slugify(item.trim()).slice(0, 60))
    .filter((item) => item !== '')
    .slice(0, 8);
  const alt = typeof record.alt === 'string' ? record.alt.trim().slice(0, 200) : '';
  const caption = typeof record.caption === 'string' ? record.caption.trim().slice(0, 200) : '';
  return { title, slug: slugify(slugSource).slice(0, 120), excerpt, content, tags, alt, caption };
}

/**
 * Membuat draf artikel dari gambar dokumen atau foto kegiatan.
 *
 * @param input.base64 - Gambar base64, dibatasi 7 juta karakter.
 * @param input.mimeType - Tipe MIME gambar; hanya JPEG, PNG, dan WebP.
 * @param input.hint - Petunjuk redaksi opsional.
 * @param input.organizationId - Organisasi untuk cakupan kredensial dan audit.
 * @returns Draf visual dari model, atau pesan galat yang aman.
 */
export async function ocVisionDraft(input: { readonly base64: string; readonly mimeType: string; readonly hint?: string; readonly organizationId?: string }): Promise<{ readonly ok: true; readonly draft: VisionDraft } | { readonly ok: false; readonly error: string }> {
  const compact = input.base64.replace(/^data:image\/[a-z0-9.+-]+;base64,/i, '');
  if (compact === '' || compact.length > AI_LIMITS.base64) return { ok: false, error: 'Berkas gambar terlalu besar atau kosong.' };
  const mimeType = input.mimeType.trim().toLowerCase();
  if (!VISION_MIME_ALLOWLIST.has(mimeType)) return { ok: false, error: 'Format gambar belum didukung. Gunakan JPEG, PNG, atau WebP.' };
  if (!/^[A-Za-z0-9+/=\s]+$/.test(compact)) return { ok: false, error: 'Berkas gambar tidak valid.' };
  const hint = truncateInput(input.hint ?? '', 500);
  if (hint !== '') {
    const scanned = scanPrompt(hint);
    if (!scanned.ok) return { ok: false, error: scanned.reason };
  }
  const result = await runQuery('editor', input.organizationId, {
    prompt: hint === '' ? 'Ekstrak gambar terlampir menjadi draf berita.' : `Ekstrak gambar terlampir menjadi draf berita.\n\nPetunjuk redaksi:\n${hint}`,
    systemInstruction: VISION_SYSTEM, temperature: 0.3, maxOutputTokens: 2048, responseMimeType: 'application/json',
    responseSchema: VISION_DRAFT_SCHEMA, thinkingTask: 'caption',
    images: [{ base64: compact, mimeType }],
  });
  if (!result.ok) return result;
  const draft = parseVisionDraft(result.text);
  if (draft === null) return { ok: false, error: BUSY_MESSAGE };
  return { ok: true, draft };
}

/**
 * Merangkum angka dasbor yang diberikan menjadi narasi tanpa klaim baru.
 *
 * @param input.summary - Ringkasan angka dari dasbor.
 * @param input.organizationId - Organisasi untuk cakupan kredensial dan audit.
 * @returns Narasi insight atau pesan sibuk.
 */
export async function narrateInsights(input: { readonly summary: string; readonly organizationId?: string }): Promise<{ readonly ok: true; readonly narrative: string } | { readonly ok: false; readonly error: string }> {
  const summary = truncateInput(input.summary, 2000);
  if (summary.length < 10) return { ok: false, error: 'Ringkasan angka minimal 10 karakter.' };
  const result = await runQuery('editor', input.organizationId, {
    prompt: `Susun narasi 3-5 kalimat dari ringkasan dasbor berikut. Jangan tambah angka.\n\n${summary}`,
    systemInstruction: INSIGHT_SYSTEM, temperature: 0.3, maxOutputTokens: 512, thinkingTask: 'summarize',
  });
  if (!result.ok) return result;
  const narrative = result.text.trim().slice(0, 1500);
  if (narrative === '') return { ok: false, error: BUSY_MESSAGE };
  return { ok: true, narrative };
}
