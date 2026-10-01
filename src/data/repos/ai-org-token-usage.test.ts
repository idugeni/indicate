import { describe, expect, it } from 'vitest';

import { getOrganizationTokenUsage, type AiTokenRollupDb } from '@/data/repos/ai';

function fakeDb(rows: readonly unknown[]): AiTokenRollupDb {
  return { execute: async () => [...rows] };
}

describe('getOrganizationTokenUsage', () => {
  it('mengagregat SUM token dan COUNT per model', async () => {
    const db = fakeDb([
      { model_name: 'gemini-2.5-flash', requests: '3', prompt_tokens: '100', completion_tokens: '50', total_tokens: '150' },
      { model_name: 'gemini-2.5-pro', requests: 1, prompt_tokens: 40, completion_tokens: 20, total_tokens: 60 },
    ]);
    const rows = await getOrganizationTokenUsage(db, 'org-a', new Date('2026-09-01T00:00:00.000Z'));
    expect(rows).toEqual([
      { modelName: 'gemini-2.5-flash', requests: 3, promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      { modelName: 'gemini-2.5-pro', requests: 1, promptTokens: 40, completionTokens: 20, totalTokens: 60 },
    ]);
  });

  it('menerima cutoff string dan hasil kosong', async () => {
    const rows = await getOrganizationTokenUsage(fakeDb([]), 'org-a', '2026-09-01T00:00:00.000Z');
    expect(rows).toEqual([]);
  });

  it('menormalkan nilai non-numerik menjadi nol', async () => {
    const db = fakeDb([{ model_name: 'm', requests: null, prompt_tokens: null, completion_tokens: null, total_tokens: null }]);
    const rows = await getOrganizationTokenUsage(db, 'org-a', new Date('2026-09-01T00:00:00.000Z'));
    expect(rows).toEqual([{ modelName: 'm', requests: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0 }]);
  });
});
