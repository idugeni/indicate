import { describe, expect, it } from 'vitest';

import { buildTtsInput, isAudioWithinCap, pickAudio, synthesizeSpeech } from '@/modules/ai/ai-tts';

describe('pickAudio', () => {
  it('mengembalikan audio pertama dan melewati lampiran non-audio', () => {
    const picked = pickAudio([
      { mimeType: 'image/png', base64: 'aGVsbG8=' },
      { mimeType: 'audio/wav', base64: 'UklGRg==' },
      { mimeType: 'audio/mp3', base64: 'SUQz' },
    ]);
    expect(picked).toEqual({ mimeType: 'audio/wav', base64: 'UklGRg==' });
  });

  it('mengembalikan null bila tidak ada kandidat audio', () => {
    expect(pickAudio(undefined)).toBeNull();
    expect(pickAudio([])).toBeNull();
    expect(pickAudio([{ mimeType: 'text/plain', base64: 'aGVsbG8=' }])).toBeNull();
    expect(pickAudio([{ mimeType: 'audio/wav', base64: '' }])).toBeNull();
  });

  it('menerima awalan audio tanpa peduli kapitalisasi', () => {
    expect(pickAudio([{ mimeType: 'AUDIO/WAV', base64: 'UklGRg==' }])?.mimeType).toBe('AUDIO/WAV');
  });
});

describe('buildTtsInput', () => {
  it('menolak teks kosong tanpa memanggil model', () => {
    expect(buildTtsInput('   ').ok).toBe(false);
  });

  it('memangkas teks melewati 4000 karakter', () => {
    const built = buildTtsInput('x'.repeat(5000));
    expect(built.ok).toBe(true);
    if (built.ok) expect(built.prompt.length).toBeLessThanOrEqual(4001);
  });

  it('memakai suara bawaan bila kosong dan menjaga suara valid', () => {
    const fallback = buildTtsInput('Halo dunia');
    expect(fallback.ok).toBe(true);
    if (fallback.ok) expect(fallback.voiceName).toBe('Kore');
    const custom = buildTtsInput('Halo dunia', 'Puck');
    if (custom.ok) expect(custom.voiceName).toBe('Puck');
  });

  it('menolak nama suara di luar pola aman', () => {
    expect(buildTtsInput('Halo dunia', 'suara; rm -rf').ok).toBe(false);
  });
});

describe('isAudioWithinCap', () => {
  it('menerima audio kecil dan menolak audio raksasa', () => {
    expect(isAudioWithinCap({ mimeType: 'audio/wav', base64: 'UklGRg==' })).toBe(true);
    expect(isAudioWithinCap({ mimeType: 'audio/wav', base64: 'A'.repeat(8_000_000) })).toBe(false);
  });
});

describe('synthesizeSpeech tanpa control plane', () => {
  it('menolak teks kosong tanpa memanggil model', async () => {
    const result = await synthesizeSpeech({ text: '   ' });
    expect(result.ok).toBe(false);
  });

  it('mengembalikan pesan sibuk saat control plane belum dikonfigurasi', async () => {
    const result = await synthesizeSpeech({ text: 'Banjir surut di Wonosobo.' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('sibuk');
  });
});
