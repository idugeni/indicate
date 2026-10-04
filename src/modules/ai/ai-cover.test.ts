import { describe, expect, it } from 'vitest';

import { buildCoverImagePrompt, generateCoverImage, pickCoverImage, TASK_MODEL_PROFILE, taskThinkingOverride } from '@/modules/ai/ai-cover';

describe('buildCoverImagePrompt', () => {
  it('menyusun deskripsi visual dengan preset foto jurnalistik dan bingkai 16:9', () => {
    const built = buildCoverImagePrompt({ title: 'Banjir Surut di Wonosobo', style: 'Foto jurnalistik', aspectRatio: '16:9' });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.prompt).toContain('Banjir Surut di Wonosobo');
    expect(built.prompt).toContain('foto jurnalistik');
    expect(built.prompt).toContain('16:9');
    expect(built.prompt).toContain('tanpa menampilkan teks');
  });

  it('memetakan preset ilustrasi datar, sinematik, dan bingkai potret', () => {
    const flat = buildCoverImagePrompt({ title: 'Pasar Pagi Wonosobo', style: 'Ilustrasi datar', aspectRatio: '1:1' });
    expect(flat.ok && flat.prompt).toContain('ilustrasi datar');
    const cinematic = buildCoverImagePrompt({ title: 'Pasar Pagi Wonosobo', style: 'Sinematik', aspectRatio: '9:16' });
    expect(cinematic.ok && cinematic.prompt).toContain('sinematik');
    expect(cinematic.ok && cinematic.prompt).toContain('9:16');
  });

  it('memakai deskripsi gaya bebas bila label tidak dikenal', () => {
    const built = buildCoverImagePrompt({ title: 'Pasar Pagi Wonosobo', style: 'Sketsa pensil lembut' });
    expect(built.ok && built.prompt).toContain('Sketsa pensil lembut');
  });

  it('menolak judul kosong dan terlalu pendek tanpa memanggil model', () => {
    expect(buildCoverImagePrompt({ title: '   ' }).ok).toBe(false);
    expect(buildCoverImagePrompt({ title: 'Aye' }).ok).toBe(false);
  });
});

describe('pickCoverImage', () => {
  it('mengembalikan gambar pertama dan melewati lampiran teks', () => {
    const picked = pickCoverImage([
      { mimeType: 'text/plain', base64: 'aGVsbG8=' },
      { mimeType: 'image/png', base64: 'aW1hZ2U=' },
      { mimeType: 'image/jpeg', base64: 'bW9yZQ==' },
    ]);
    expect(picked).toEqual({ mimeType: 'image/png', base64: 'aW1hZ2U=' });
  });

  it('mengembalikan null bila tidak ada lampiran gambar', () => {
    expect(pickCoverImage(undefined)).toBeNull();
    expect(pickCoverImage([])).toBeNull();
    expect(pickCoverImage([{ mimeType: 'text/plain', base64: 'aGVsbG8=' }])).toBeNull();
    expect(pickCoverImage([{ mimeType: 'image/png', base64: '' }])).toBeNull();
  });
});

describe('generateCoverImage fallback', () => {
  it('menolak judul kosong tanpa memanggil model', async () => {
    const result = await generateCoverImage({ title: '' });
    expect(result.ok).toBe(false);
  });

  it('mengembalikan pesan sibuk saat control plane sampul belum dikonfigurasi', async () => {
    const result = await generateCoverImage({ title: 'Banjir Surut di Wonosobo', style: 'Foto jurnalistik', aspectRatio: '16:9' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('sibuk');
  });
});

describe('grounding sampul', () => {
  it('menambahkan kalimat anti-halusinasi di akhir prompt perilaku lama', () => {
    const built = buildCoverImagePrompt({ title: 'Banjir Surut di Wonosobo' });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.prompt).toContain('jangan menambah fakta baru');
  });

  it('menyertakan kutipan dan isi acuan terpotong bila diberikan', () => {
    const built = buildCoverImagePrompt({ title: 'Banjir Surut di Wonosobo', excerpt: 'Air setinggi lutut.', body: 'Warga mengungsi ke balai desa.' });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.prompt).toContain('Kutipan acuan:\nAir setinggi lutut.');
    expect(built.prompt).toContain('Isi acuan (terpotong):\nWarga mengungsi ke balai desa.');
    expect(built.prompt.endsWith('di luar teks tersebut.')).toBe(true);
  });
});

describe('TASK_MODEL_PROFILE dan taskThinkingOverride sampul', () => {
  it('memetakan delapan tugas ke tier murah dengan suhu sampul 0.8', () => {
    expect(Object.keys(TASK_MODEL_PROFILE).sort()).toEqual(['caption', 'chat', 'cover', 'polish', 'seo', 'summarize', 'transcribe', 'tts']);
    expect(TASK_MODEL_PROFILE.cover).toEqual({ modelTier: 'murah', temperature: 0.8, thinkingBudget: 0 });
  });

  it('mengembalikan anggaran nol untuk sampul dan menghormati override pemanggil', () => {
    expect(taskThinkingOverride('cover')).toEqual({ thinkingBudget: 0 });
    expect(taskThinkingOverride('sampul')).toEqual({ thinkingBudget: 0 });
    expect(taskThinkingOverride('polish')).toEqual({ thinkingBudget: 8192, includeThoughts: true });
    expect(taskThinkingOverride('cover', { thinkingBudget: 1024 })).toEqual({ thinkingBudget: 1024 });
  });

  it('membuang karakter kontrol dari gaya bebas dan menjaga batas 120', () => {
    const built = buildCoverImagePrompt({ title: 'Pasar Pagi Wonosobo', style: 'Sketsa\x00pensil\x07lembut\u200B' });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.prompt).toContain('Sketsapensillembut');
    expect(built.prompt).not.toContain('\x00');
    expect(built.prompt).not.toContain('\x07');
    expect(built.prompt).not.toContain('\u200B');
  });
});
