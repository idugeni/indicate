import { parseCoverCaption } from '@/modules/ai/ai-usage';
import { parseExcerptSuggestion, parseMetaDescription, parseTitleSuggestions } from '@/modules/ai/ai-seo';
import { parsePolishedBody } from '@/modules/ai/ai-polish';

import type { GoldenFixture } from '@/modules/ai/eval/golden-fixtures';
import { GOLDEN_FIXTURES } from '@/modules/ai/eval/golden-fixtures';

/**
 * Hasil penilaian satu kasus emas.
 *
 * @param id - Identifikasi kasus yang dinilai.
 * @param ok - Benar bila output lolos seluruh aturan bentuk.
 * @param reasons - Alasan kegagalan; kosong bila lolos.
 */
export interface EvalCaseResult {
  readonly id: string;
  readonly ok: boolean;
  readonly reasons: readonly string[];
}

/**
 * Ringkasan satu putaran eval prompt.
 *
 * @param passed - Jumlah kasus yang lolos.
 * @param failed - Jumlah kasus yang gagal.
 * @param results - Rincian per kasus.
 */
export interface EvalReport {
  readonly passed: number;
  readonly failed: number;
  readonly results: readonly EvalCaseResult[];
}

/**
 * Menilai output tiruan model memakai parser dan batas existing.
 *
 * @remarks Tanpa memanggil provider: hanya `parseTitleSuggestions`,
 * `parseMetaDescription`, `parseExcerptSuggestion`, `parsePolishedBody`,
 * dan `parseCoverCaption` beserta batas panjangnya. Jalankan sebelum
 * promosi model (`releaseStage` pada `AiModelConfig` dari `staging` ke
 * `stable`); promosikan versi prompt hanya bila `failed` nol.
 * @param fixtures - Kasus yang dinilai; default `GOLDEN_FIXTURES`.
 * @returns Ringkasan lolos dan gagal per kasus.
 */
export function runPromptEval(fixtures: readonly GoldenFixture[] = GOLDEN_FIXTURES): EvalReport {
  const results = fixtures.map((fixture): EvalCaseResult => {
    if (fixture.task === 'seo-bundle') return checkSeoBundle(fixture);
    if (fixture.task === 'polish') return checkPolish(fixture);
    return checkCaption(fixture);
  });
  const passed = results.filter((result) => result.ok).length;
  return { passed, failed: results.length - passed, results };
}

/**
 * Menilai paket SEO: judul, meta, dan kutipan sekaligus.
 *
 * @param fixture - Kasus bertugas `seo-bundle`.
 * @returns Hasil penilaian dengan alasan kegagalan bentuk.
 */
export function checkSeoBundle(fixture: GoldenFixture): EvalCaseResult {
  const reasons: string[] = [];
  const titles = parseTitleSuggestions(fixture.modelOutput);
  if (titles === null || titles.length === 0) {
    reasons.push('judul tidak terurai');
  } else {
    if (titles.length > 3) reasons.push('judul melebihi 3 varian');
    for (const title of titles) {
      if (title.length > 110) reasons.push(`judul melebihi 110 karakter: ${title.slice(0, 24)}`);
    }
  }
  const meta = parseMetaDescription(fixture.modelOutput);
  if (meta === null || meta === '') reasons.push('meta tidak terurai');
  else if (meta.length > 160) reasons.push('meta melebihi 160 karakter');
  const excerpt = parseExcerptSuggestion(fixture.modelOutput);
  if (excerpt === null) reasons.push('kutipan tidak terurai');
  else if (excerpt.length > 400) reasons.push('kutipan melebihi 400 karakter');
  return { id: fixture.id, ok: reasons.length === 0, reasons };
}

/**
 * Menilai naskah poles memakai parser existing.
 *
 * @param fixture - Kasus bertugas `polish`.
 * @returns Hasil penilaian dengan alasan kegagalan bentuk.
 */
export function checkPolish(fixture: GoldenFixture): EvalCaseResult {
  const reasons: string[] = [];
  const body = parsePolishedBody(fixture.modelOutput);
  if (body === null || body === '') reasons.push('naskah poles tidak terurai');
  else if (body.length > 20000) reasons.push('naskah melebihi 20000 karakter');
  return { id: fixture.id, ok: reasons.length === 0, reasons };
}

/**
 * Menilai alt dan caption sampul memakai parser existing.
 *
 * @param fixture - Kasus bertugas `caption`.
 * @returns Hasil penilaian dengan alasan kegagalan bentuk.
 */
export function checkCaption(fixture: GoldenFixture): EvalCaseResult {
  const reasons: string[] = [];
  const parsed = parseCoverCaption(fixture.modelOutput);
  if (parsed === null) {
    reasons.push('alt dan caption tidak terurai');
  } else {
    if (parsed.alt === '' && parsed.caption === '') reasons.push('alt dan caption kosong');
    if (parsed.alt.length > 200) reasons.push('alt melebihi 200 karakter');
    if (parsed.caption.length > 200) reasons.push('caption melebihi 200 karakter');
  }
  return { id: fixture.id, ok: reasons.length === 0, reasons };
}
