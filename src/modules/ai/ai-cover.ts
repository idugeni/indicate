import 'server-only';

import { executeAiQuery, type AiServiceDeps } from '@/modules/ai/ai-service';
import type { AiCallerRole, AiThinkingConfig } from '@/modules/ai/ai-types';
import { scanPrompt, truncateInput } from '@/modules/ai/ai-usage';

const BUSY_MESSAGE = 'Layanan AI sedang sibuk. Silakan coba lagi.';

const GROUNDING_SENTENCE =
  'Gunakan hanya fakta dari judul, kutipan, dan isi yang diberikan; jangan menambah fakta baru di luar teks tersebut.';

/**
 * Jenis tugas AI yang dipetakan ke profil model hemat.
 *
 * @remarks Kunci `ringkas` adalah alias tugas `summarize` di control plane.
 */
export type AiTaskKind = 'caption' | 'seo' | 'polish' | 'ringkas' | 'sampul' | 'chat' | 'embed';

/**
 * Profil model hemat per tugas: tier murah, suhu yang disarankan, dan anggaran thinking.
 *
 * @remarks `thinkingBudget` yang `undefined` berarti memakai default kanal adapter.
 */
export interface TaskModelProfile {
  readonly modelTier: 'murah';
  readonly temperature: number;
  readonly thinkingBudget?: number | undefined;
}

/**
 * Matriks tugas ke profil model hemat.
 *
 * @remarks Caption dan SEO memakai penalaran pendek agar cepat; polish dan
 * ringkas memakai anggaran besar agar hasilnya matang; sampul, chat, dan
 * embed memakai default kanal tanpa thinking tambahan.
 */
export const TASK_MODEL_PROFILE: Record<AiTaskKind, TaskModelProfile> = {
  caption: { modelTier: 'murah', temperature: 0.3, thinkingBudget: 1024 },
  seo: { modelTier: 'murah', temperature: 0.5, thinkingBudget: 2048 },
  polish: { modelTier: 'murah', temperature: 0.5, thinkingBudget: 8192 },
  ringkas: { modelTier: 'murah', temperature: 0.3, thinkingBudget: 8192 },
  sampul: { modelTier: 'murah', temperature: 0.8 },
  chat: { modelTier: 'murah', temperature: 0.7 },
  embed: { modelTier: 'murah', temperature: 0 },
};

/**
 * Mengembalikan override thinking untuk satu tugas dari matriks profil.
 *
 * @param task - Tugas yang menentukan anggaran default.
 * @param userOverride - Override eksplisit pemanggil, dihormati lebih dulu.
 * @returns Konfigurasi thinking tugas tersebut, atau undefined bila memakai default kanal.
 */
export function taskThinkingOverride(
  task: AiTaskKind | (string & {}),
  userOverride?: AiThinkingConfig | undefined,
): AiThinkingConfig | undefined {
  if (userOverride?.thinkingBudget !== undefined) return userOverride;
  const profile = (TASK_MODEL_PROFILE as Record<string, TaskModelProfile>)[task];
  if (profile?.thinkingBudget === undefined) return undefined;
  return { thinkingBudget: profile.thinkingBudget, includeThoughts: true };
}

const COVER_MODEL = 'gemini-3.1-flash-image';

const COVER_IMAGE_BASE64_LIMIT = 5_242_880;

const COVER_STYLE_FRAGMENTS: Readonly<Record<string, string>> = {
  'foto jurnalistik': 'gaya foto jurnalistik realistis dengan pencahayaan alami',
  'ilustrasi datar': 'gaya ilustrasi datar vektor yang minimalis dan bersih',
  sinematik: 'gaya sinematik dramatis dengan pencahayaan moody',
};

const COVER_ASPECT_FRAGMENTS: Readonly<Record<CoverAspectRatio, string>> = {
  '16:9': 'komposisi lanskap lebar 16:9',
  '1:1': 'komposisi persegi 1:1',
  '9:16': 'komposisi potret vertikal 9:16',
};

const COVER_SYSTEM = [
  'Kamu adalah ilustrator redaksi media berita Indonesia.',
  'Hasilkan satu gambar sampul editorial yang fotorealistik.',
  'Jangan menampilkan teks, huruf, angka, logo, atau watermark di dalam gambar.',
].join('\n');

let configured: AiServiceDeps | null = null;

export type CoverAspectRatio = '16:9' | '1:1' | '9:16';

export interface CoverImageFile {
  readonly mimeType: string;
  readonly base64: string;
}

export interface CoverImageInput {
  readonly title: string;
  readonly style?: string | undefined;
  readonly aspectRatio?: CoverAspectRatio | undefined;
  readonly excerpt?: string | undefined;
  readonly body?: string | undefined;
  readonly thinkingConfig?: AiThinkingConfig | undefined;
  readonly organizationId?: string | undefined;
}

/**
 * Mengikat generator sampul ke control plane AI paralel.
 *
 * @param deps - Batas database, budget, dan adapter dari rute API. Panggil berdampingan dengan configureAiUsage.
 */
export function configureAiCover(deps: AiServiceDeps): void {
  configured = deps;
}

/**
 * Menyusun deskripsi visual sampul editorial dari judul dan preset gaya.
 *
 * @param input.title - Judul artikel sumber visual; minimal 5 karakter.
 * @param input.style - Label preset (Foto jurnalistik, Ilustrasi datar, Sinematik) atau deskripsi bebas.
 * @param input.aspectRatio - Komposisi bingkai; default 16:9.
 * @param input.excerpt - Kutipan acuan opsional sebagai grounding visual; kosong berarti perilaku lama.
 * @param input.body - Isi acuan terpotong opsional sebagai grounding visual; kosong berarti perilaku lama.
 * @returns Judul ternormalisasi, prompt visual, dan instruksi sistem; atau galat validasi.
 */
export function buildCoverImagePrompt(input: { readonly title: string; readonly style?: string | undefined; readonly aspectRatio?: CoverAspectRatio | undefined; readonly excerpt?: string | undefined; readonly body?: string | undefined }): {
  readonly ok: true;
  readonly title: string;
  readonly prompt: string;
  readonly systemInstruction: string;
} | { readonly ok: false; readonly error: string } {
  const title = truncateInput(input.title, 200);
  if (title === '') return { ok: false, error: 'Judul diperlukan untuk gambar sampul.' };
  if (title.length < 5) return { ok: false, error: 'Judul minimal 5 karakter.' };
  const aspectRatio = input.aspectRatio ?? '16:9';
  const styleKey = (input.style ?? '').trim().toLowerCase();
  const styleFragment = styleKey === '' || styleKey === 'foto jurnalistik'
    ? COVER_STYLE_FRAGMENTS['foto jurnalistik']
    : (COVER_STYLE_FRAGMENTS[styleKey] ?? truncateInput(input.style ?? '', 120));
  const excerpt = truncateInput(input.excerpt ?? '', 2000);
  const body = truncateInput(input.body ?? '', 2000);
  const prompt = `Buatkan gambar sampul editorial untuk berita berjudul "${title}". ${styleFragment}, ${COVER_ASPECT_FRAGMENTS[aspectRatio]}. Visualisasikan suasana yang sesuai dengan judul tanpa menampilkan teks, huruf, angka, logo, atau watermark apa pun di dalam gambar.${excerpt === '' ? '' : `\n\nKutipan acuan:\n${excerpt}`}${body === '' ? '' : `\n\nIsi acuan (terpotong):\n${body}`}\n${GROUNDING_SENTENCE}`;
  return { ok: true, title, prompt, systemInstruction: COVER_SYSTEM };
}

/**
 * Memilih gambar sampul pertama dari lampiran inline model.
 *
 * @param inlineData - Lampiran inline dari respons model; boleh kosong.
 * @returns Berkas gambar pertama bertipe image/* atau null bila tidak ada.
 */
export function pickCoverImage(inlineData: readonly { readonly mimeType: string; readonly base64: string }[] | undefined): CoverImageFile | null {
  if (inlineData === undefined) return null;
  for (const item of inlineData) {
    if (item.mimeType.toLowerCase().startsWith('image/') && item.base64 !== '') return { mimeType: item.mimeType, base64: item.base64 };
  }
  return null;
}

async function runCoverQuery(callerRole: AiCallerRole, organizationId: string | undefined, query: {
  readonly prompt: string;
  readonly systemInstruction: string;
  readonly temperature: number;
  readonly maxOutputTokens: number;
  readonly thinkingConfig?: AiThinkingConfig | undefined;
}): Promise<{ readonly ok: true; readonly text: string; readonly inlineData?: readonly { readonly mimeType: string; readonly base64: string }[] } | { readonly ok: false; readonly error: string }> {
  const scanned = scanPrompt(query.prompt);
  if (!scanned.ok) return { ok: false, error: scanned.reason };
  if (configured === null) return { ok: false, error: BUSY_MESSAGE };
  const result = await executeAiQuery(configured, {
    prompt: query.prompt,
    organizationId: organizationId ?? null,
    systemInstruction: query.systemInstruction,
    temperature: query.temperature,
    maxOutputTokens: query.maxOutputTokens,
    thinkingConfig: query.thinkingConfig ?? taskThinkingOverride('sampul'),
    channel: 'web',
    callerRole,
    enableTools: false,
    modelOverride: COVER_MODEL,
    responseModalities: ['TEXT', 'IMAGE'],
  });
  if (result.error !== undefined || (result.text.trim() === '' && (result.inlineData?.length ?? 0) === 0)) return { ok: false, error: BUSY_MESSAGE };
  return {
    ok: true,
    text: result.text,
    ...(result.inlineData === undefined || result.inlineData.length === 0 ? {} : { inlineData: result.inlineData }),
  };
}

/**
 * Membuat gambar sampul editorial dari judul artikel via model gambar Nano Banana.
 *
 * @param input.title - Judul artikel sumber visual.
 * @param input.style - Preset gaya atau deskripsi bebas opsional.
 * @param input.aspectRatio - Komposisi bingkai opsional.
 * @param input.excerpt - Kutipan acuan opsional sebagai grounding visual.
 * @param input.body - Isi acuan terpotong opsional sebagai grounding visual.
 * @param input.thinkingConfig - Override thinking eksplisit; default memakai profil tugas sampul.
 * @param input.organizationId - Organisasi untuk cakupan kredensial dan audit.
 * @returns Berkas gambar beserta teks model, atau pesan galat yang aman.
 */
export async function generateCoverImage(input: CoverImageInput): Promise<{ readonly ok: true; readonly image: CoverImageFile; readonly text: string } | { readonly ok: false; readonly error: string }> {
  const built = buildCoverImagePrompt({ title: input.title, style: input.style, aspectRatio: input.aspectRatio, excerpt: input.excerpt, body: input.body });
  if (!built.ok) return built;
  const result = await runCoverQuery('editor', input.organizationId, {
    prompt: built.prompt,
    systemInstruction: built.systemInstruction,
    temperature: TASK_MODEL_PROFILE.sampul.temperature,
    maxOutputTokens: 512,
    ...(input.thinkingConfig === undefined ? {} : { thinkingConfig: input.thinkingConfig }),
  });
  if (!result.ok) return result;
  const image = pickCoverImage(result.inlineData);
  if (image === null) return { ok: false, error: BUSY_MESSAGE };
  if (image.base64.length > COVER_IMAGE_BASE64_LIMIT) return { ok: false, error: 'Hasil gambar melebihi batas 5 MB.' };
  return { ok: true, image, text: result.text };
}
