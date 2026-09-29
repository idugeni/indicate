// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import {
  DashboardCollectionsSkeleton,
  DashboardContentSkeleton,
  DashboardFormSkeleton,
  DashboardPanelSkeleton,
  DashboardStatsSkeleton,
  DashboardTableSkeleton,
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

  it('menyusun dua tabel untuk skeleton koleksi', () => {
    render(<DashboardCollectionsSkeleton />);
    const shell = screen.getByRole('status');
    expect(shell.getAttribute('aria-label')).toBe('Memuat data modul');
    expect(shell.className).toContain('space-y-10');
  });
});
