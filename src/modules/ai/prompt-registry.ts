/**
 * Registry versi prompt per tugas AI.
 *
 * @remarks
 * Menambah versi baru (mis. `v2`): tambah entri pada tugas terkait di
 * `PROMPT_REGISTRY` tanpa mengubah entri `v1` yang sudah berjalan, lalu
 * jalankan eval (`runPromptEval` dari `@/modules/ai/eval/eval-runner`)
 * memakai template baru sebelum promosi model (mis. `releaseStage` pada
 * `AiModelConfig` dari `staging` ke `stable`). Promosikan versi hanya bila
 * seluruh fixtures emas lolos.
 *
 * @example
 * ```ts
 * const system = getPromptTemplate('seo-bundle');
 * const stabil = getPromptTemplate('seo-bundle', 'v1');
 * ```
 */
export type PromptTask = 'seo-bundle' | 'polish' | 'caption';

/**
 * Satu template prompt berversi untuk satu tugas.
 *
 * @param key - Tugas pemilik template.
 * @param version - Versi template (`v1`, `v2`, ...).
 * @param template - Isi template dengan placeholder `{{title}}` dan `{{body}}`.
 */
export interface PromptTemplate {
  readonly key: PromptTask;
  readonly version: string;
  readonly template: string;
}

const PROMPT_REGISTRY: Readonly<Record<PromptTask, Readonly<Record<string, string>>>> = {
  'seo-bundle': {
    v1: [
      'Susun paket SEO redaksi: 3 varian judul, satu deskripsi meta, satu kutipan ringkas.',
      'Judul: {{title}}',
      'Isi: {{body}}',
      'Keluarkan JSON murni: {"titles":["..."],"meta_description":"...","excerpt":"..."}',
    ].join('\n'),
  },
  polish: {
    v1: [
      'Poles naskah berikut tanpa mengubah fakta.',
      'Judul: {{title}}',
      'Isi: {{body}}',
      'Keluarkan JSON murni: {"body":"..."}',
    ].join('\n'),
  },
  caption: {
    v1: [
      'Susun teks alt dan keterangan foto dari konteks berikut.',
      'Judul: {{title}}',
      'Isi: {{body}}',
      'Keluarkan JSON murni: {"alt":"...","caption":"..."}',
    ].join('\n'),
  },
};

const DEFAULT_VERSION = 'v1';

/**
 * Mengambil template prompt untuk satu tugas dan versi.
 *
 * @param task - Tugas pemilik template.
 * @param version - Versi yang diminta; default versi stabil terakhir.
 * @returns Isi template generik dengan placeholder `{{title}}` dan `{{body}}`.
 * @throws {RangeError} Bila tugas atau versi tidak terdaftar.
 */
export function getPromptTemplate(task: PromptTask, version: string = DEFAULT_VERSION): string {
  const versions = PROMPT_REGISTRY[task];
  if (versions === undefined) throw new RangeError(`Tugas prompt tidak dikenal: ${task}`);
  const template = versions[version];
  if (template === undefined) throw new RangeError(`Versi prompt tidak dikenal: ${task}@${version}`);
  return template;
}

/**
 * Mendaftar versi template yang tersedia untuk satu tugas.
 *
 * @param task - Tugas pemilik template.
 * @returns Daftar versi terurut (`v1`, `v2`, ...).
 * @throws {RangeError} Bila tugas tidak terdaftar.
 */
export function listPromptVersions(task: PromptTask): readonly string[] {
  const versions = PROMPT_REGISTRY[task];
  if (versions === undefined) throw new RangeError(`Tugas prompt tidak dikenal: ${task}`);
  return Object.keys(versions).sort();
}
