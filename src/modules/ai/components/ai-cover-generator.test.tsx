// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { AiCoverGenerator } from '@/modules/ai/components/ai-cover-generator';
import { callAi } from '@/modules/ai/components/ai-client';

vi.mock('@/modules/ai/components/ai-client', () => ({ callAi: vi.fn() }));

const mockedCallAi = vi.mocked(callAi);

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe('AiCoverGenerator', () => {
  it('menonaktifkan tombol tanpa organizationId', () => {
    render(<AiCoverGenerator onImage={() => {}} />);
    expect((screen.getByRole('button', { name: /buat gambar sampul/i }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('menampilkan pratinjau data URL setelah generate berhasil', async () => {
    mockedCallAi.mockResolvedValue({ image: { mimeType: 'image/png', base64: 'aGVsbG8=' } });
    render(<AiCoverGenerator organizationId="org-1" defaultPrompt="Banjir Surut di Wonosobo" onImage={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /buat gambar sampul/i }));
    const preview = await screen.findByAltText('Pratinjau sampul AI');
    expect(preview.getAttribute('src')).toBe('data:image/png;base64,aGVsbG8=');
    expect(mockedCallAi).toHaveBeenCalledWith('org-1', 'cover-image', { title: 'Banjir Surut di Wonosobo', style: 'Foto jurnalistik', aspectRatio: '16:9' });
  });

  it('meneruskan preset gaya dan rasio terpilih ke aksi cover-image', async () => {
    mockedCallAi.mockResolvedValue({ image: { mimeType: 'image/jpeg', base64: 'aW1hZ2U=' } });
    render(<AiCoverGenerator organizationId="org-1" defaultPrompt="Pasar Pagi Wonosobo" onImage={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Sinematik' }));
    fireEvent.click(screen.getByRole('button', { name: '9:16' }));
    fireEvent.click(screen.getByRole('button', { name: /buat gambar sampul/i }));
    await screen.findByAltText('Pratinjau sampul AI');
    expect(mockedCallAi).toHaveBeenCalledWith('org-1', 'cover-image', { title: 'Pasar Pagi Wonosobo', style: 'Sinematik', aspectRatio: '9:16' });
  });

  it('meneruskan gambar ke onImage saat editor menekan gunakan gambar', async () => {
    mockedCallAi.mockResolvedValue({ image: { mimeType: 'image/png', base64: 'aGVsbG8=' } });
    const onImage = vi.fn();
    render(<AiCoverGenerator organizationId="org-1" defaultPrompt="Banjir Surut di Wonosobo" onImage={onImage} />);
    fireEvent.click(screen.getByRole('button', { name: /buat gambar sampul/i }));
    await screen.findByAltText('Pratinjau sampul AI');
    fireEvent.click(screen.getByRole('button', { name: /gunakan gambar/i }));
    expect(onImage).toHaveBeenCalledWith({ mimeType: 'image/png', base64: 'aGVsbG8=' });
  });

  it('menampilkan galat role=alert saat layanan gagal', async () => {
    mockedCallAi.mockRejectedValue(new Error('Layanan AI sedang sibuk. Silakan coba lagi.'));
    render(<AiCoverGenerator organizationId="org-1" defaultPrompt="Banjir Surut di Wonosobo" onImage={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /buat gambar sampul/i }));
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('sibuk');
    expect(screen.queryByAltText('Pratinjau sampul AI')).toBeNull();
  });
});
