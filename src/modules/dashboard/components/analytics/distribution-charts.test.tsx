// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { SiteBubbles } from '@/modules/dashboard/components/analytics/bubbles';
import { Timeline } from '@/modules/dashboard/components/analytics/timeline';
import { TreeMap } from '@/modules/dashboard/components/analytics/treemap';
import type { RecentActivity } from '@/modules/dashboard/models';

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe(): void {
      return undefined;
    }
    unobserve(): void {
      return undefined;
    }
    disconnect(): void {
      return undefined;
    }
  },
);

afterEach(() => {
  cleanup();
});

describe('Pohon volume', () => {
  it('memangkas total ke 12 teratas, bukan seluruh baris', () => {
    const rows = Array.from({ length: 15 }, (slot, index) => ({ key: `situs-${index}`, count: index + 1 }));
    render(<TreeMap title="Pohon penerbit" rows={rows} emptyText="Belum ada data penerbit." />);
    expect(screen.getByText('114 total')).toBeDefined();
  });

  it('menampilkan pesan kosong tanpa data', () => {
    render(<TreeMap title="Pohon penerbit" rows={[]} emptyText="Belum ada data penerbit." />);
    expect(screen.getByText('Belum ada data penerbit.')).toBeDefined();
    expect(screen.getByText('0 total')).toBeDefined();
  });
});

describe('Gelembung situs', () => {
  it('mengabaikan kunci tanpa pemisah situs dan status', () => {
    render(<SiteBubbles results={[{ key: 'tanpa-pemisah', count: 5 }]} />);
    expect(screen.getByText('Belum ada hasil situs.')).toBeDefined();
  });

  it('merender kartu begitu ada pasangan situs dan status', () => {
    render(
      <SiteBubbles
        results={[
          { key: 'situs-1:published', count: 3 },
          { key: 'situs-1:failed', count: 1 },
        ]}
      />,
    );
    expect(screen.queryByText('Belum ada hasil situs.')).toBeNull();
    expect(screen.getByText('Volume vs persen sukses per situs')).toBeDefined();
  });
});

describe('Lini masa aktivitas', () => {
  const EVENTS: readonly RecentActivity[] = [
    { id: 'j-1', label: 'Kabar tayang', status: 'published', at: '2026-09-18T09:00:00.000Z' },
    { id: 'j-2', label: 'Kabar gagal', status: 'failed', at: '2026-09-18T08:00:00.000Z' },
    { id: 'j-3', label: 'Kabar antre', status: 'queued', at: '2026-09-18T07:00:00.000Z' },
    { id: 'j-4', label: 'Kabar lain', status: 'archived', at: '2026-09-18T06:00:00.000Z' },
  ];

  it('menampilkan pesan kosong saat tidak ada aktivitas', () => {
    render(<Timeline events={[]} />);
    expect(screen.getByText('Belum ada aktivitas tercatat.')).toBeDefined();
  });

  it('memberi nada berbeda per status operasi', () => {
    const { container } = render(<Timeline events={EVENTS} />);
    const tones = [...container.querySelectorAll('li > span[aria-hidden="true"]')].map((node) => node.className);
    expect(tones.some((className) => className.includes('bg-signal'))).toBe(true);
    expect(tones.some((className) => className.includes('bg-error'))).toBe(true);
    expect(tones.some((className) => className.includes('bg-warning'))).toBe(true);
    expect(tones.some((className) => className.includes('bg-paper-faint'))).toBe(true);
  });

  it('menyembunyikan konektor garis pada aktivitas terakhir', () => {
    const { container } = render(<Timeline events={EVENTS} />);
    const items = [...container.querySelectorAll('li')];
    const connectors = items.map((item) => item.querySelectorAll('span[aria-hidden="true"]').length);
    expect(connectors.at(-1)).toBe(1);
  });

  it('membuat label status kapital', () => {
    render(<Timeline events={EVENTS} />);
    expect(screen.getByText('published')).toBeDefined();
    expect(screen.getByText('failed')).toBeDefined();
  });
});
