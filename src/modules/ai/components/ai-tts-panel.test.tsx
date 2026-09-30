// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { AiTtsPanel } from '@/modules/ai/components/ai-tts-panel';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function okFetch(audio: unknown): void {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ audio }), { status: 200 })));
}

function failFetch(): void {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: { message: 'sibuk' } }), { status: 429 })));
}

describe('AiTtsPanel', () => {
  it('menonaktifkan tombol tanpa organisasi atau teks', () => {
    const { unmount } = render(<AiTtsPanel sourceText="Halo" />);
    expect(screen.getByRole('button', { name: /buatkan suara/i })).toBeDisabled();
    unmount();
    render(<AiTtsPanel organizationId="org-1" sourceText="   " />);
    expect(screen.getByRole('button', { name: /buatkan suara/i })).toBeDisabled();
  });

  it('menampilkan pratinjau audio dan tautan unduh lalu memanggil onAudio', async () => {
    const onAudio = vi.fn();
    okFetch({ mimeType: 'audio/wav', base64: 'UklGRg==' });
    render(<AiTtsPanel organizationId="org-1" sourceText="Banjir surut di Wonosobo." onAudio={onAudio} />);
    fireEvent.click(screen.getByRole('button', { name: /buatkan suara/i }));
    await waitFor(() => expect(screen.getByLabelText(/pratinjau audio/i)).toBeInTheDocument());
    const preview = screen.getByLabelText(/pratinjau audio/i) as HTMLAudioElement;
    expect(preview.getAttribute('src')).toBe('data:audio/wav;base64,UklGRg==');
    const download = screen.getByRole('link', { name: /unduh audio/i });
    expect(download.getAttribute('href')).toBe('data:audio/wav;base64,UklGRg==');
    expect(download.getAttribute('download')).toBe('artikel-suara.wav');
    expect(onAudio).toHaveBeenCalledWith({ mimeType: 'audio/wav', base64: 'UklGRg==' });
  });

  it('menampilkan pesan galat saat layanan sibuk', async () => {
    failFetch();
    render(<AiTtsPanel organizationId="org-1" sourceText="Banjir surut." />);
    fireEvent.click(screen.getByRole('button', { name: /buatkan suara/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.queryByLabelText(/pratinjau audio/i)).toBeNull();
  });

  it('menampilkan pesan galat saat respons tanpa audio', async () => {
    okFetch(undefined);
    render(<AiTtsPanel organizationId="org-1" sourceText="Banjir surut." />);
    fireEvent.click(screen.getByRole('button', { name: /buatkan suara/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  });
});
