import { describe, expect, it } from 'vitest';

import { buildPublisherVerifyInput, parseVerification, verifyPublisher } from '@/modules/ai/ai-verify';

describe('parseVerification', () => {
  it('mengurai penilaian JSON lengkap', () => {
    const raw = JSON.stringify({
      summary: 'Dugaan penerbit komunitas dengan bukti parsial.',
      risk_level: 'sedang',
      checklist: ['Cek referensi Dewan Pers', 'Minta salinan legalitas'],
      recommendation: 'Minta bukti tambahan sebelum menyetujui.',
    });
    const assessment = parseVerification(raw);
    expect(assessment?.summary).toContain('Dugaan');
    expect(assessment?.riskLevel).toBe('sedang');
    expect(assessment?.checklist).toHaveLength(2);
    expect(assessment?.recommendation).toContain('bukti tambahan');
  });

  it('mengurai JSON berpagar kode dan kunci camelCase', () => {
    const raw = '```json\n{"summary":"Dugaan arsip lama.","riskLevel":"rendah","checklist":[],"recommendation":""}\n```';
    expect(parseVerification(raw)?.riskLevel).toBe('rendah');
  });

  it('menormalkan tingkat risiko tak dikenal menjadi sedang dan memotong checklist maksimal 6', () => {
    const raw = JSON.stringify({
      summary: 'Dugaan bukti tidak konsisten.',
      risk_level: 'kritis',
      checklist: ['satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', ''],
      recommendation: 'Tinjau manual.',
    });
    const assessment = parseVerification(raw);
    expect(assessment?.riskLevel).toBe('sedang');
    expect(assessment?.checklist).toHaveLength(6);
  });

  it('mengembalikan null untuk JSON rusak atau ringkasan kosong', () => {
    expect(parseVerification('bukan json')).toBeNull();
    expect(parseVerification('{"summary":"","risk_level":"rendah","checklist":[],"recommendation":""}')).toBeNull();
    expect(parseVerification('{"risk_level":"rendah"}')).toBeNull();
  });
});

describe('buildPublisherVerifyInput', () => {
  it('menolak nama penerbit yang terlalu pendek', () => {
    expect(buildPublisherVerifyInput('ab', 'ref-001').ok).toBe(false);
  });

  it('menerima bukti kosong dengan penanda eksplisit', () => {
    const built = buildPublisherVerifyInput('Radar Wonosobo', '');
    expect(built.ok).toBe(true);
    if (built.ok) expect(built.prompt).toContain('tidak ada bukti');
  });
});

describe('verifyPublisher fallback sibuk', () => {
  it('mengembalikan pesan sibuk saat control plane belum dikonfigurasi', async () => {
    const result = await verifyPublisher({ name: 'Radar Wonosobo', evidence: 'ref-dewanpers-2026-09' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('sibuk');
  });

  it('menolak nama kosong tanpa memanggil model', async () => {
    const result = await verifyPublisher({ name: '  ', evidence: 'ref-001' });
    expect(result.ok).toBe(false);
  });
});
