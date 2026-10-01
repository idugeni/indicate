import { describe, expect, it } from 'vitest';

import { GOLDEN_FIXTURES } from '@/modules/ai/eval/golden-fixtures';
import { runPromptEval } from '@/modules/ai/eval/eval-runner';
import { getPromptTemplate, listPromptVersions } from '@/modules/ai/prompt-registry';

describe('runPromptEval', () => {
  it('meloloskan seluruh fixtures emas', () => {
    const report = runPromptEval();
    expect(report.failed).toBe(0);
    expect(report.passed).toBe(GOLDEN_FIXTURES.length);
  });

  it('menggagalkan output rusak tanpa memanggil provider', () => {
    const report = runPromptEval([
      { id: 'rusak', task: 'seo-bundle', title: 'Judul', body: 'Isi', modelOutput: 'bukan json' },
      { id: 'kosong', task: 'polish', title: 'Judul', body: 'Isi', modelOutput: '{"body":""}' },
    ]);
    expect(report.failed).toBe(2);
    expect(report.results.every((result) => !result.ok && result.reasons.length > 0)).toBe(true);
  });
});

describe('getPromptTemplate', () => {
  it('mengembalikan v1 sebagai default tiap tugas', () => {
    expect(getPromptTemplate('seo-bundle')).toContain('{{title}}');
    expect(getPromptTemplate('polish')).toContain('{{body}}');
    expect(getPromptTemplate('caption')).toContain('{{title}}');
    expect(listPromptVersions('seo-bundle')).toEqual(['v1']);
  });

  it('menolak tugas atau versi tak dikenal', () => {
    expect(() => getPromptTemplate('seo-bundle', 'v9')).toThrow(RangeError);
  });
});
