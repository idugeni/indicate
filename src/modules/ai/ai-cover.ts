import 'server-only';

import type { AiServiceDeps } from '@/modules/ai/ai-service';
import { runTaskQuery } from '@/modules/ai/ai-task-query';
import { TASK_MODEL_PROFILE } from '@/modules/ai/ai-task-profiles';
import type { AiThinkingConfig } from '@/modules/ai/ai-types';
import { truncateInput } from '@/modules/ai/ai-usage';

export type { AiTaskKind } from '@/modules/ai/ai-task-profiles';
export { TASK_MODEL_PROFILE, taskThinkingOverride } from '@/modules/ai/ai-task-profiles';

const BUSY_MESSAGE = 'Layanan AI sedang sibuk. Silakan coba lagi.';

const GROUNDING_SENTENCE =
  'Gunakan hanya fakta dari judul, kutipan, dan isi yang diberikan; jangan menambah fakta baru di luar teks tersebut.';

const COVER_MODEL = 'gemini-3.1-flash-lite-image';

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
 * Strip control and non-printable chars from a free-form cover style.
 *
 * @param value - Raw style label from the caller.
 * @returns Printable-only style text, still uncapped.
 */
function stripStyleControl(value: string): string {
  return value.replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u2028-\u202F\uFEFF]/g, '');
}

/**
 * Build the editorial cover visual description from title and style preset.
 *
 * @param input.title - Source article title; at least 5 chars.
 * @param input.style - Preset label or free-form description (120 chars max).
 * @param input.aspectRatio - Frame composition; defaults to 16:9.
 * @param input.excerpt - Optional excerpt grounding the visual.
 * @param input.body - Optional truncated body grounding the visual.
 * @returns Normalized title, visual prompt, and system instruction, or a validation error.
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
    : (COVER_STYLE_FRAGMENTS[styleKey] ?? truncateInput(stripStyleControl(input.style ?? ''), 120));
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

/**
 * Generate one editorial cover image from an article title.
 *
 * @param input.title - Source article title for the visual.
 * @param input.style - Optional style preset or free-form description.
 * @param input.aspectRatio - Optional frame composition.
 * @param input.excerpt - Optional excerpt grounding the visual.
 * @param input.body - Optional truncated body grounding the visual.
 * @param input.thinkingConfig - Explicit thinking override; else cover profile.
 * @param input.organizationId - Organization scoping credentials and audit.
 * @returns Image file plus model text, or a safe error message.
 */
export async function generateCoverImage(input: CoverImageInput): Promise<{ readonly ok: true; readonly image: CoverImageFile; readonly text: string } | { readonly ok: false; readonly error: string }> {
  const built = buildCoverImagePrompt({ title: input.title, style: input.style, aspectRatio: input.aspectRatio, excerpt: input.excerpt, body: input.body });
  if (!built.ok) return built;
  // Cover is a non-text task: forward thinkingBudget 0 via the cover profile.
  // AiThinkingConfig permits 0, so it travels as thinkingConfig as-is.
  const result = await runTaskQuery(configured, 'editor', input.organizationId, {
    prompt: built.prompt,
    systemInstruction: built.systemInstruction,
    temperature: TASK_MODEL_PROFILE.cover.temperature,
    maxOutputTokens: 4096,
    thinkingTask: 'cover',
    ...(input.thinkingConfig === undefined ? {} : { thinkingConfig: input.thinkingConfig }),
    modelOverride: COVER_MODEL,
    responseModalities: ['TEXT', 'IMAGE'],
  });
  if (!result.ok) return result;
  const image = pickCoverImage(result.inlineData);
  if (image === null) return { ok: false, error: BUSY_MESSAGE };
  if (image.base64.length > COVER_IMAGE_BASE64_LIMIT) return { ok: false, error: 'Hasil gambar melebihi batas 5 MB.' };
  return { ok: true, image, text: result.text };
}
