// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { AiTranscribePanel } from '@/modules/ai/components/ai-transcribe-panel';
import { callAi } from '@/modules/ai/components/ai-client';

vi.mock('@/modules/ai/components/ai-client', () => ({ callAi: vi.fn() }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.mocked(callAi).mockReset();
});

function stubFileReader(dataUrl: string): void {
  vi.stubGlobal(
    'FileReader',
    class {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      result: string | null = null;
      readAsDataURL(): void {
        this.result = dataUrl;
        queueMicrotask(() => this.onload?.());
      }
    },
  );
}

function pickFile(mimeType: string): void {
  const input = screen.getByLabelText(/pilih berkas audio/i);
  fireEvent.change(input, { target: { files: [new File(['rekaman'], 'wawancara.mp3', { type: mimeType })] } });
}

describe('AiTranscribePanel', () => {
  it('menonaktifkan tombol saat berkas atau organisasi belum ada', () => {
    render(<AiTranscribePanel onTranscript={() => undefined} />);
    expect((screen.getByRole('button', { name: /transkripsikan audio/i }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('menolak format audio di luar allowlist sebelum memanggil AI', async () => {
    render(<AiTranscribePanel organizationId="org-1" onTranscript={() => undefined} />);
    pickFile('video/mp4');
    fireEvent.click(screen.getByRole('button', { name: /transkripsikan audio/i }));
    expect((await screen.findByRole('alert')).textContent).toContain('belum didukung');
    expect(callAi).not.toHaveBeenCalled();
  });

  it('menampilkan pratinjau dan menerapkan transkrip ke pemanggil', async () => {
    stubFileReader('data:audio/mpeg;base64,aGVsbG8=');
    vi.mocked(callAi).mockResolvedValue({ transcript: 'Pembicara 1: Selamat pagi.' });
    const onTranscript = vi.fn();
    render(<AiTranscribePanel organizationId="org-1" onTranscript={onTranscript} />);
    pickFile('audio/mpeg');
    fireEvent.click(screen.getByRole('button', { name: /transkripsikan audio/i }));
    expect(await screen.findByText('Pembicara 1: Selamat pagi.')).toBeDefined();
    expect(callAi).toHaveBeenCalledWith('org-1', 'transcribe-audio', expect.objectContaining({ mimeType: 'audio/mpeg' }));
    fireEvent.click(screen.getByRole('button', { name: /terapkan ke isi/i }));
    expect(onTranscript).toHaveBeenCalledWith('Pembicara 1: Selamat pagi.');
  });

  it('menampilkan peringatan saat layanan gagal', async () => {
    stubFileReader('data:audio/mpeg;base64,aGVsbG8=');
    vi.mocked(callAi).mockRejectedValue(new Error('Layanan AI sedang sibuk. Silakan coba lagi.'));
    render(<AiTranscribePanel organizationId="org-1" onTranscript={() => undefined} />);
    pickFile('audio/mpeg');
    fireEvent.click(screen.getByRole('button', { name: /transkripsikan audio/i }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('sibuk'));
  });
});
