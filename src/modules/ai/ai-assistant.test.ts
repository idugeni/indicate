import { describe, expect, it } from 'vitest';

import { assistantChat, buildAssistantPrompt } from '@/modules/ai/ai-assistant';

describe('buildAssistantPrompt', () => {
  it('melipat transkrip berlabel plus pertanyaan saat ini', () => {
    const prompt = buildAssistantPrompt([
      { role: 'user', text: 'Apa itu slug?' },
      { role: 'assistant', text: 'Slug adalah pengenal URL.' },
      { role: 'user', text: 'Bagaimana membuatnya?' },
    ]);
    expect(prompt).toContain('Pengguna: Apa itu slug?');
    expect(prompt).toContain('Asisten: Slug adalah pengenal URL.');
    expect(prompt).toContain('Pertanyaan saat ini: Bagaimana membuatnya?');
  });

  it('hanya memakai enam pesan terakhir', () => {
    const messages = Array.from({ length: 8 }, (_, index) => ({ role: 'user' as const, text: `pesan redaksi ${index}` }));
    const prompt = buildAssistantPrompt(messages);
    expect(prompt).not.toContain('pesan redaksi 0');
    expect(prompt).not.toContain('pesan redaksi 1');
    expect(prompt).toContain('pesan redaksi 7');
  });

  it('membatasi total 4000 karakter', () => {
    const prompt = buildAssistantPrompt([{ role: 'user', text: `berita banjir ${'x'.repeat(5000)}` }]);
    expect(prompt.length).toBeLessThanOrEqual(4000);
  });

  it('mengembalikan string kosong untuk riwayat kosong', () => {
    expect(buildAssistantPrompt([])).toBe('');
    expect(buildAssistantPrompt([{ role: 'user', text: '   ' }])).toBe('');
  });
});

describe('assistantChat fallback', () => {
  it('menolak riwayat kosong tanpa memanggil model', async () => {
    const result = await assistantChat({ messages: [] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('Pesan');
  });

  it('menolak prompt berisi materi mirip rahasia', async () => {
    const result = await assistantChat({ messages: [{ role: 'user', text: 'kunci sk-abcdefgh12345678 bocor, jelaskan' }] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('rahasia');
  });

  it('mengembalikan pesan sibuk saat control plane belum dikonfigurasi', async () => {
    const result = await assistantChat({ messages: [{ role: 'user', text: 'Bagaimana menyusun judul berita?' }] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('sibuk');
  });
});
