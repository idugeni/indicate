import 'server-only';

import { executeAiQuery, type AiServiceDeps } from '@/modules/ai/ai-service';
import type { AiCallerRole } from '@/modules/ai/ai-types';
import { scanPrompt, truncateInput } from '@/modules/ai/ai-usage';

const BUSY_MESSAGE = 'Layanan AI sedang sibuk. Silakan coba lagi.';

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
 * @returns Judul ternormalisasi, prompt visual, dan instruksi sistem; atau galat validasi.
 */
export function buildCoverImagePrompt(input: { readonly title: string; readonly style?: string | undefined; readonly aspectRatio?: CoverAspectRatio | undefined }): {
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
  const prompt = `Buatkan gambar sampul editorial untuk berita berjudul "${title}". ${styleFragment}, ${COVER_ASPECT_FRAGMENTS[aspectRatio]}. Visualisasikan suasana yang sesuai dengan judul tanpa menampilkan teks, huruf, angka, logo, atau watermark apa pun di dalam gambar.`;
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
 * @param input.organizationId - Organisasi untuk cakupan kredensial dan audit.
 * @returns Berkas gambar beserta teks model, atau pesan galat yang aman.
 */
export async function generateCoverImage(input: CoverImageInput): Promise<{ readonly ok: true; readonly image: CoverImageFile; readonly text: string } | { readonly ok: false; readonly error: string }> {
  const built = buildCoverImagePrompt({ title: input.title, style: input.style, aspectRatio: input.aspectRatio });
  if (!built.ok) return built;
  const result = await runCoverQuery('editor', input.organizationId, {
    prompt: built.prompt,
    systemInstruction: built.systemInstruction,
    temperature: 0.8,
    maxOutputTokens: 512,
  });
  if (!result.ok) return result;
  const image = pickCoverImage(result.inlineData);
  if (image === null) return { ok: false, error: BUSY_MESSAGE };
  if (image.base64.length > COVER_IMAGE_BASE64_LIMIT) return { ok: false, error: 'Hasil gambar melebihi batas 5 MB.' };
  return { ok: true, image, text: result.text };
}
