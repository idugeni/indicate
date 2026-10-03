// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AiSeoAssist } from '@/modules/ai/components/ai-seo-assist';
import { callAi } from '@/modules/ai/components/ai-client';

vi.mock('@/modules/ai/components/ai-client', () => ({
  callAi: vi.fn(),
}));

vi.mock('sonner', async () => (await import('@/test/stubs/sonner')).sonnerStub());

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

const SUGGESTION = {
  titles: ['Banjir Surut di Wonosobo', 'Warga Kembali Pascabanjir'],
  metaDescription: 'Banjir di Wonosobo surut dan warga kembali.',
  excerpt: 'Air surut, warga kembali.',
};

describe('AiSeoAssist', () => {
  it('menonaktifkan tombol tanpa organizationId atau tanpa judul dan isi', () => {
    render(<AiSeoAssist currentTitle="" currentBody="" onApply={() => {}} />);
    expect((screen.getByRole('button', { name: /sempurnakan seo/i }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('menampilkan saran tanpa menerapkan otomatis lalu menerapkan pilihan editor', async () => {
    const mocked = vi.mocked(callAi);
    mocked.mockImplementation(async (_org: string, action: string) => {
      if (action === 'seo-titles') return { titles: SUGGESTION.titles };
      if (action === 'seo-meta') return { metaDescription: SUGGESTION.metaDescription };
      return { excerpt: SUGGESTION.excerpt };
    });
    const onApply = vi.fn();
    const user = userEvent.setup();
    render(<AiSeoAssist organizationId="org-1" currentTitle="Banjir" currentBody="Air surut." onApply={onApply} />);

    await user.click(screen.getByRole('button', { name: /sempurnakan seo/i }));
    await waitFor(() => expect(mocked).toHaveBeenCalledWith('org-1', 'seo-titles', { title: 'Banjir', body: 'Air surut.' }));
    await waitFor(() => expect(mocked).toHaveBeenCalledWith('org-1', 'seo-meta', { title: 'Banjir', body: 'Air surut.' }));
    await waitFor(() => expect(mocked).toHaveBeenCalledWith('org-1', 'seo-excerpt', { title: 'Banjir', body: 'Air surut.' }));
    await waitFor(() => expect(screen.queryByText('Banjir Surut di Wonosobo')).not.toBeNull());
    expect(onApply).not.toHaveBeenCalled();

    await user.click(screen.getAllByRole('button', { name: 'Pakai judul' })[0]!);
    expect(onApply).toHaveBeenCalledWith({ title: 'Banjir Surut di Wonosobo' });

    await user.click(screen.getByRole('button', { name: 'Terapkan semua' }));
    expect(onApply).toHaveBeenCalledWith({
      title: 'Banjir Surut di Wonosobo',
      metaDescription: SUGGESTION.metaDescription,
      excerpt: SUGGESTION.excerpt,
    });
  });

  it('menampilkan galat dalam peran alert saat layanan gagal', async () => {
    vi.mocked(callAi).mockRejectedValue(new Error('Layanan AI sedang sibuk. Silakan coba lagi.'));
    const user = userEvent.setup();
    render(<AiSeoAssist organizationId="org-1" currentTitle="Banjir" currentBody="" onApply={() => {}} />);

    await user.click(screen.getByRole('button', { name: /sempurnakan seo/i }));
    await waitFor(() => expect(screen.queryByRole('alert')?.textContent ?? '').toContain('sibuk'));
  });

  it('meminta varian baru saat tombol buat ulang diklik', async () => {
    const mocked = vi.mocked(callAi);
    mocked.mockImplementation(async (_org: string, action: string) => {
      if (action === 'seo-titles') return { titles: SUGGESTION.titles };
      if (action === 'seo-meta') return { metaDescription: SUGGESTION.metaDescription };
      return { excerpt: SUGGESTION.excerpt };
    });
    const user = userEvent.setup();
    render(<AiSeoAssist organizationId="org-1" currentTitle="Banjir" currentBody="Air surut." onApply={() => {}} />);

    await user.click(screen.getByRole('button', { name: /sempurnakan seo/i }));
    await waitFor(() => expect(screen.queryByText('Banjir Surut di Wonosobo')).not.toBeNull());
    await user.click(screen.getByRole('button', { name: /buat ulang varian/i }));
    await waitFor(() => expect(mocked).toHaveBeenCalledWith('org-1', 'seo-titles', { title: 'Banjir', body: 'Air surut.' }));
    expect(mocked.mock.calls.filter((call) => call[1] === 'seo-titles').length).toBeGreaterThanOrEqual(2);
  });
});
