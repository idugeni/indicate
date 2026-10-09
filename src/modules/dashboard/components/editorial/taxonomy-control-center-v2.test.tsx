// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { DashboardCommand } from '@/modules/dashboard/command';

vi.mock('nuqs', async () => (await import('@/test/stubs/nuqs')).nuqsStub());

import { TaxonomyControlCenterV2 } from './taxonomy-control-center-v2';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const data = {
  categories: [
    { id: 'c-1', name: 'Politik', slug: 'politik', status: 'active', version: 1, articleCount: 2 },
    { id: 'c-2', name: 'Ekonomi', slug: 'ekonomi', status: 'active', version: 3, articleCount: 0 },
    {
      id: 'c-3',
      name: 'Arsip Lama',
      slug: 'arsip-lama',
      status: 'archived',
      version: 1,
      articleCount: 1,
    },
  ],
  tags: [
    { tag: 'harga-emas', count: 2 },
    { tag: 'politik', count: 1 },
  ],
};

const command = vi.fn(async () => ({})) as unknown as DashboardCommand;

describe('Taxonomy Control Center V2', () => {
  it('shows data-derived category, usage, and tag posture', async () => {
    render(<TaxonomyControlCenterV2 data={data} command={command} organizationId="org-1" />);
    expect(await screen.findByRole('heading', { name: 'Taxonomy Studio' })).toBeDefined();
    expect(screen.getByText('Total kategori')).toBeDefined();
    expect(screen.getAllByText('Belum digunakan').length).toBeGreaterThan(0);
    expect(screen.getByText('Perlu ditinjau')).toBeDefined();
    expect(screen.getByRole('article', { name: 'Politik' })).toBeDefined();
    expect(screen.getByText('#harga-emas')).toBeDefined();
    expect(screen.getByText('3 asosiasi tag–artikel tercatat')).toBeDefined();
  });

  it('filters category cards and tag vocabulary locally without a fetch', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(<TaxonomyControlCenterV2 data={data} command={command} />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Cari kategori atau tag' }), {
      target: { value: 'eko' },
    });
    expect(screen.getByRole('article', { name: 'Ekonomi' })).toBeDefined();
    expect(screen.queryByRole('article', { name: 'Politik' })).toBeNull();
    expect(screen.queryByText('#harga-emas')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('filters unused categories and preserves source status', async () => {
    render(<TaxonomyControlCenterV2 data={data} command={command} />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Status kategori' }), {
      target: { value: 'unused' },
    });
    expect(screen.getByRole('article', { name: 'Ekonomi' })).toBeDefined();
    expect(screen.queryByRole('article', { name: 'Politik' })).toBeNull();
  });

  it('opens the existing mutation manager only on explicit action', async () => {
    render(<TaxonomyControlCenterV2 data={data} command={command} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Kelola taksonomi' }));
    expect(await screen.findByRole('button', { name: 'Daftarkan Kategori' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Kembali ke Taxonomy Studio' })).toBeDefined();
    expect(command).not.toHaveBeenCalled();
  });

  it('handles empty or malformed snapshots without inventing taxonomy rows', () => {
    render(
      <TaxonomyControlCenterV2 data={{ categories: null, tags: 'invalid' }} command={command} />,
    );
    expect(screen.getByText('Total kategori')).toBeDefined();
    expect(screen.getByText('Belum ada kategori')).toBeDefined();
    expect(screen.getByText('Belum ada tag')).toBeDefined();
  });
});
