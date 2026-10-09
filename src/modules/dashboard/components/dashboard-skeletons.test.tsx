// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import {
  DashboardCollectionsSkeleton,
  DashboardContentSkeleton,
  DashboardFormsGridSkeleton,
  DashboardFormSkeleton,
  DashboardMediaSkeleton,
  DashboardMiniCardsSkeleton,
  DashboardSplitFormSkeleton,
  DashboardStatsSkeleton,
  DashboardTablesGridSkeleton,
  DashboardTilesSkeleton,
  DashboardViewSkeleton,
  DashboardPanelSkeleton,
  DashboardTableSkeleton,
  DashboardTabsSkeleton,
} from '@/modules/dashboard/components/dashboard-skeletons';

afterEach(() => {
  cleanup();
});

describe('Skeleton dashboard', () => {
  it('menandai cangkang beranimasi sebagai busy dengan label yang bisa dibaca', () => {
    render(<DashboardFormSkeleton />);
    const shell = screen.getByRole('status');
    expect(shell.getAttribute('aria-busy')).toBe('true');
    expect(shell.getAttribute('aria-label')).toBe('Memuat formulir');
  });

  it('merender delapan kotak statistik sesuai kisi ringkasan', () => {
    const { container } = render(<DashboardStatsSkeleton />);
    const grid = container.firstElementChild;
    expect(grid?.getAttribute('aria-hidden')).toBe('true');
    expect(grid?.querySelectorAll(':scope > div')).toHaveLength(8);
  });

  it('merender panel dan tabel sebagai murni dekoratif tanpa status', () => {
    const { container: panel } = render(<DashboardPanelSkeleton />);
    const { container: table } = render(<DashboardTableSkeleton />);
    expect(panel.querySelector('[role="status"]')).toBeNull();
    expect(panel.firstElementChild?.getAttribute('aria-hidden')).toBe('true');
    expect(table.querySelector('[role="status"]')).toBeNull();
    expect(table.firstElementChild?.getAttribute('aria-hidden')).toBe('true');
  });

  it('menyusun statistik lalu panel untuk skeleton konten', () => {
    render(<DashboardContentSkeleton />);
    const shell = screen.getByRole('status');
    expect(shell.getAttribute('aria-label')).toBe('Memuat data workspace');
    expect(shell.className).toContain('space-y-6');
  });

  it('menyusun dua panel data dengan ritme grid yang konsisten', () => {
    render(<DashboardCollectionsSkeleton />);
    const shell = screen.getByRole('status');
    expect(shell.getAttribute('aria-label')).toBe('Memuat data modul');
    expect(shell.className).toContain('space-y-6');
  });

  it('meniru kisi tabel dan formulir sesuai jumlah kolom konten', () => {
    const { container: tables } = render(<DashboardTablesGridSkeleton columns={3} />);
    expect(tables.firstElementChild?.innerHTML).toContain('lg:grid-cols-3');
    const { container: forms } = render(<DashboardFormsGridSkeleton columns={2} />);
    expect(forms.firstElementChild?.innerHTML).toContain('md:grid-cols-2');
  });

  it('membentuk skeleton sesuai view aktif', () => {
    const { unmount } = render(<DashboardViewSkeleton view="configuration" />);
    expect(screen.getByRole('status', { name: 'Memuat data modul' })).toBeDefined();
    unmount();
    cleanup();
    render(<DashboardViewSkeleton view="dashboard" />);
    expect(screen.getByRole('status', { name: 'Memuat data workspace' })).toBeDefined();
  });

  it('meniru kisi media, kartu mini, dan form terpisah sesuai konten', () => {
    const { container: media, unmount: unmountMedia } = render(<DashboardMediaSkeleton />);
    expect(media.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(0);
    expect(screen.getByRole('status', { name: 'Memuat pustaka media' })).toBeDefined();
    unmountMedia();
    cleanup();
    const { container: split } = render(<DashboardSplitFormSkeleton />);
    expect(split.textContent).toBe('');
    cleanup();
    render(<DashboardMiniCardsSkeleton count={4} />);
    render(<DashboardTilesSkeleton count={4} />);
  });

  it('membentuk skeleton untuk semua view tanpa fallback generik yang salah', () => {
    const views = [
      'configuration',
      'publishers',
      'editorial',
      'taxonomy',
      'articles',
      'media',
      'publishing',
      'published',
      'analytics',
      'audit',
      'operations',
      'settings',
      'customers',
      'content',
      'billing',
      'moderation',
      'ai',
    ] as const;
    for (const view of views) {
      const { unmount } = render(<DashboardViewSkeleton view={view} />);
      expect(screen.getByRole('status')).toBeDefined();
      unmount();
      cleanup();
    }
  });

  it('merender bilah tab sebagai murni dekoratif tanpa status', () => {
    const { container } = render(<DashboardTabsSkeleton />);
    expect(container.querySelector('[role="status"]')).toBeNull();
    expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe('true');
  });
});
