'use client';

import { useCallback } from 'react';
import { parseAsInteger, parseAsStringEnum, useQueryState } from 'nuqs';

import type { View } from '@/modules/dashboard/components/dashboard-types';

const VIEWS = [
  'dashboard',
  'configuration',
  'publishers',
  'editorial',
  'media',
  'publishing',
  'analytics',
  'audit',
  'operations',
  'settings',
  'customers',
  'content',
  'billing',
  'moderation',
] as const;

/**
 * Selaraskan tab dasbor aktif dengan `?view=` agar tautan bisa dibagikan.
 *
 * @returns Pasangan nilai `View` dan penyetel yang mendorong riwayat browser.
 */
export function useDashboardView(): readonly [View, (next: View) => void] {
  const [view, setViewQuery] = useQueryState(
    'view',
    parseAsStringEnum([...VIEWS]).withDefault('dashboard').withOptions({ scroll: false, history: 'push' }),
  );
  const setView = useCallback((next: View) => {
    void setViewQuery(next);
  }, [setViewQuery]);
  return [view, setView];
}

/**
 * Selaraskan halaman tabel aktif dengan `?page=` agar paginasi bisa dibagikan.
 *
 * @returns Pasangan nomor halaman (minimal 1) dan penyetel pengganti riwayat.
 */
export function useDashboardPage(): readonly [number, (next: number) => void] {
  const [page, setPageQuery] = useQueryState(
    'page',
    parseAsInteger.withDefault(1).withOptions({ scroll: false, history: 'replace' }),
  );
  const setPage = useCallback((next: number) => {
    void setPageQuery(next < 1 ? null : next);
  }, [setPageQuery]);
  const safePage = Number.isInteger(page) && page > 0 ? page : 1;
  return [safePage, setPage];
}
