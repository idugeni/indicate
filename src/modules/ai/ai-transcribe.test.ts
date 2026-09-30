import { describe, expect, it } from 'vitest';

import {
  TRANSCRIBE_AUDIO_MIME_ALLOWLIST,
  TRANSCRIBE_BASE64_LIMIT,
  parseTranscript,
  transcribeAudio,
} from '@/modules/ai/ai-transcribe';

describe('parseTranscript', () => {
  it('mengurai JSON {transcript} beserta pagar kode', () => {
    const raw = '```json\n{"transcript":"Pembicara 1: Selamat pagi."}\n```';
    expect(parseTranscript(raw)).toBe('Pembicara 1: Selamat pagi.');
  });

  it('menerima teks mentah tanpa JSON', () => {
    expect(parseTranscript('Hasil wawancara hari ini.')).toBe('Hasil wawancara hari ini.');
  });

  it('mengembalikan null untuk keluaran kosong', () => {
    expect(parseTranscript('')).toBeNull();
    expect(parseTranscript('   ')).toBeNull();
    expect(parseTranscript('{"transcript":""}')).toBeNull();
    expect(parseTranscript('{"transcript":"   "}')).toBeNull();
    expect(parseTranscript('{"ringkasan":"tanpa transkrip"}')).toBe('{"ringkasan":"tanpa transkrip"}');
  });
});

describe('transcribeAudio validasi', () => {
  it('mengekspos batas dan allowlist sesuai kontrak', () => {
    expect(TRANSCRIBE_BASE64_LIMIT).toBe(10_000_000);
    for (const mimeType of ['audio/wav', 'audio/x-wav', 'audio/mp3', 'audio/mpeg', 'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/aac']) {
      expect(TRANSCRIBE_AUDIO_MIME_ALLOWLIST.has(mimeType)).toBe(true);
    }
  });

  it('menolak audio melebihi batas sebelum model', async () => {
    const result = await transcribeAudio({ base64: 'x'.repeat(10_000_001), mimeType: 'audio/mpeg' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('terlalu besar');
  });

  it('menolak mime di luar allowlist', async () => {
    expect((await transcribeAudio({ base64: 'aGVsbG8=', mimeType: 'audio/flac' })).ok).toBe(false);
    expect((await transcribeAudio({ base64: 'aGVsbG8=', mimeType: 'video/mp4' })).ok).toBe(false);
    expect((await transcribeAudio({ base64: 'aGVsbG8=', mimeType: '' })).ok).toBe(false);
  });

  it('menolak base64 kosong dan rusak tanpa memanggil model', async () => {
    expect((await transcribeAudio({ base64: '', mimeType: 'audio/mpeg' })).ok).toBe(false);
    expect((await transcribeAudio({ base64: 'data:audio/mpeg;base64,', mimeType: 'audio/mpeg' })).ok).toBe(false);
    expect((await transcribeAudio({ base64: 'bukan-base64!!!', mimeType: 'audio/mpeg' })).ok).toBe(false);
  });

  it('menerima data URL audio dan menunda karena control plane belum dikonfigurasi', async () => {
    for (const mimeType of ['audio/wav', 'audio/mpeg', 'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/aac']) {
      const result = await transcribeAudio({ base64: `data:${mimeType};base64,aGVsbG8=`, mimeType });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toContain('sibuk');
    }
  });
});
