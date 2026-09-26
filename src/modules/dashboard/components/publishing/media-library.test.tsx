// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { MediaLibrary } from '@/modules/dashboard/components/publishing/media-library';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), promise: vi.fn((task: Promise<unknown>) => task) },
}));

vi.mock('next/dynamic', () => ({ default: () => null }));

afterEach(() => {
  cleanup();
});

function asset(index: number, owner: 'organization' | 'article' | 'site') {
  return {
    id: `m-${index}`,
    objectKey: `o/org/p/${owner}/y=2026/berkas-${index}.png`,
    purpose: 'organization-asset',
    mediaType: 'image/png',
    sizeBytes: 100_000,
    widthPx: 512,
    heightPx: 512,
    altText: null,
    caption: null,
    owner: owner === 'organization' ? { kind: 'organization' as const } : owner === 'article' ? { kind: 'article' as const, articleId: 'a-1' } : { kind: 'site' as const, siteId: 's-1' },
    state: 'active',
    createdAt: '2026-09-24T00:00:00.000Z',
  };
}

const DATA = {
  media: [asset(1, 'organization'), asset(2, 'site'), asset(3, 'article')],
  articles: [{ id: 'a-1', title: 'Banjir Wonosobo' }],
  sites: [{ id: 's-1', normalizedHostname: 'wonosobo.fakta01.my.id' }],
};

describe('MediaLibrary', () => {
  it('menampilkan ringkasan persis dan folder according kepemilikan', () => {
    render(<MediaLibrary data={DATA} command={vi.fn()} />);
    expect(screen.getByText('Gudang aset jaringan')).toBeDefined();
    expect(screen.getByRole('region', { name: 'Ringkasan pustaka media' }).textContent).toContain('3 aset · 293 KB · 3 aktif · 0 diarsipkan');
    expect(screen.getByText('3 dari 3 aset')).toBeDefined();
    expect(screen.getByRole('button', { name: /Semua media/ })).toBeDefined();
    expect(screen.getByRole('button', { name: /Organisasi/ })).toBeDefined();
    expect(screen.getByRole('button', { name: /Artikel/ })).toBeDefined();
    expect(screen.getByRole('button', { name: /Situs/ })).toBeDefined();
  });

  it('menyaring folder dan mencari nama berkas', async () => {
    const user = userEvent.setup();
    render(<MediaLibrary data={DATA} command={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /Situs/ }));
    expect(screen.getByText('1 dari 3 aset')).toBeDefined();
    expect(screen.getByText('wonosobo.fakta01.my.id')).toBeDefined();
    await user.click(screen.getByRole('button', { name: /Semua media/ }));
    expect(screen.getByText('3 dari 3 aset')).toBeDefined();
    await user.type(screen.getByLabelText('Cari aset'), 'berkas-3');
    expect(screen.getByText('1 dari 3 aset')).toBeDefined();
    expect(screen.queryByText('berkas-1.png')).toBeNull();
  });

  it('menampilkan semua folder sebagai meta dalam', () => {
    render(<MediaLibrary data={{ media: [], articles: [], sites: [] }} command={vi.fn()} />);
    expect(screen.getByText(/Belum ada aset\. Unggah foto pertama/)).toBeDefined();
  });

  it('meminta izin akses satu aset saat pratinjau ditekan', async () => {
    const user = userEvent.setup();
    const command = vi.fn(async () => ({ url: 'https://r2.example/berkas', requiredHeaders: { 'x-amz': 'sig' } }));
    render(<MediaLibrary data={DATA} command={command} />);
    await user.click(screen.getAllByRole('button', { name: /Pratinjau/ })[0]!);
    await waitFor(() => expect(command).toHaveBeenCalledWith('media.read', { mediaId: 'm-1' }));
    expect(await screen.findByAltText('berkas-1.png')).toBeDefined();
  });
});
