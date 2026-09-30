// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { AiPublisherVerify } from '@/modules/ai/components/ai-publisher-verify';

const assessment = {
  summary: 'Dugaan penerbit komunitas dengan bukti parsial.',
  riskLevel: 'sedang',
  checklist: ['Cek referensi Dewan Pers', 'Minta salinan legalitas'],
  recommendation: 'Minta bukti tambahan sebelum menyetujui.',
};

const aiResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('AiPublisherVerify', () => {
  it('menonaktifkan tombol tanpa organizationId atau nama penerbit', () => {
    render(<AiPublisherVerify publisherName="Radar Wonosobo" evidence="ref-001" />);
    expect((screen.getByRole('button', { name: /verifikasi ai/i }) as HTMLButtonElement).disabled).toBe(true);
    cleanup();
    render(<AiPublisherVerify organizationId="org-1" publisherName="  " evidence="ref-001" />);
    expect((screen.getByRole('button', { name: /verifikasi ai/i }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('menampilkan ringkasan, lencana risiko, dan checklist lalu memanggil onAssessment', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => aiResponse({ assessment })));
    let received: unknown;
    render(<AiPublisherVerify organizationId="org-1" publisherName="Radar Wonosobo" evidence="ref-001" onAssessment={(value) => { received = value; }} />);

    fireEvent.click(screen.getByRole('button', { name: /verifikasi ai/i }));

    expect(await screen.findByText(/dugaan penerbit komunitas/i)).toBeDefined();
    expect(await screen.findByText('Dugaan risiko: sedang')).toBeDefined();
    expect(await screen.findByText('Cek referensi Dewan Pers')).toBeDefined();
    expect(await screen.findByText(/keputusan verifikasi tetap di tangan manusia/i)).toBeDefined();
    expect(received).toEqual(assessment);
  });

  it('menampilkan galat role=alert saat layanan gagal', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => aiResponse({ error: { message: 'Nama penerbit minimal 3 karakter.' } }, 400)));
    render(<AiPublisherVerify organizationId="org-1" publisherName="Radar Wonosobo" evidence="ref-001" />);

    fireEvent.click(screen.getByRole('button', { name: /verifikasi ai/i }));

    expect(await screen.findByRole('alert')).toBeDefined();
  });
});
