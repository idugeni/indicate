// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AiPolishPanel } from '@/modules/ai/components/ai-polish-panel';
import { callAi } from '@/modules/ai/components/ai-client';

vi.mock('@/modules/ai/components/ai-client', () => ({ callAi: vi.fn() }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() } }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const CATEGORIES = [
  { id: 'c-1', name: 'Nasional' },
  { id: 'c-2', name: 'Ekonomi' },
];

describe('panel penyempurna AI', () => {
  it('menonaktifkan tombol saat isi kosong', () => {
    render(<AiPolishPanel currentTitle="Banjir" currentBody="" categories={CATEGORIES} onApply={() => {}} />);
    expect((screen.getByRole('button', { name: /poles isi/i }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: /lengkapi kategori/i }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('memoles isi lalu menerapkan ke formulir', async () => {
    vi.mocked(callAi).mockResolvedValue({ body: 'Paragraf poles.' });
    const onApply = vi.fn();
    const user = userEvent.setup();
    render(<AiPolishPanel organizationId="org-1" currentTitle="Banjir" currentBody="Air." categories={CATEGORIES} onApply={onApply} />);

    await user.click(screen.getByRole('button', { name: /poles isi/i }));
    await waitFor(() => expect(callAi).toHaveBeenCalledWith('org-1', 'polish-body', { title: 'Banjir', body: 'Air.' }));
    await user.click(screen.getByRole('button', { name: /terapkan ke isi/i }));
    expect(onApply).toHaveBeenCalledWith({ body: 'Paragraf poles.' });
  });

  it('meminta ulang polesan dengan tombol poles ulang', async () => {
    vi.mocked(callAi).mockResolvedValue({ body: 'Paragraf poles.' });
    const user = userEvent.setup();
    render(<AiPolishPanel organizationId="org-1" currentTitle="Banjir" currentBody="Air." categories={CATEGORIES} onApply={() => {}} />);

    await user.click(screen.getByRole('button', { name: /poles isi/i }));
    await waitFor(() => expect(screen.queryByRole('button', { name: /poles ulang/i })).not.toBeNull());
    await user.click(screen.getByRole('button', { name: /poles ulang/i }));
    await waitFor(() => expect(vi.mocked(callAi)).toHaveBeenCalledTimes(2));
  });

  it('mengklasifikasi lalu memetakan kategori ke id', async () => {
    vi.mocked(callAi).mockResolvedValue({ classification: { categories: ['Ekonomi', 'Nasional', 'Asing'], tags: ['apbd'] } });
    const onApply = vi.fn();
    const user = userEvent.setup();
    render(<AiPolishPanel organizationId="org-1" currentTitle="APBD" currentBody="Anggaran." categories={CATEGORIES} onApply={onApply} />);

    await user.click(screen.getByRole('button', { name: /lengkapi kategori/i }));
    await waitFor(() =>
      expect(callAi).toHaveBeenCalledWith('org-1', 'classify-article', {
        title: 'APBD',
        body: 'Anggaran.',
        categories: ['Nasional', 'Ekonomi'],
      }),
    );
    await user.click(screen.getByRole('button', { name: /terapkan klasifikasi/i }));
    expect(onApply).toHaveBeenCalledWith({ categoryIds: ['c-2', 'c-1'], tags: ['apbd'] });
  });
});
