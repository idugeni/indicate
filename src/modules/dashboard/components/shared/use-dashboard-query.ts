'use client';

import { useCallback } from 'react';
import { parseAsInteger, parseAsStringEnum, useQueryState } from 'nuqs';

import { ALL_VIEWS, type View } from '@/modules/dashboard/components/view-registry';

/**
 * Sync the active dashboard tab with `?view=` so links are shareable.
 *
 * @returns Pair of `View` value and setter pushing browser history.
 */
export function useDashboardView(): readonly [View, (next: View) => void] {
  const [view, setViewQuery] = useQueryState(
    'view',
    parseAsStringEnum([...ALL_VIEWS]).withDefault('dashboard').withOptions({ scroll: false, history: 'push' }),
  );
  const setView = useCallback((next: View) => {
    void setViewQuery(next);
  }, [setViewQuery]);
  return [view, setView];
}

/**
 * Sync one table's page with a query parameter so links stay shareable and the
 * browser back button steps through pages.
 *
 * @param key - Query parameter name; pass a distinct key when one view shows
 *   more than one pager, as the taxonomy manager does for categories and tags.
 * @returns Pair of page number (minimum 1) and history-replacing setter.
 * @remarks Every dashboard pager goes through here. A pager that held its page
 * in component state looked identical but lost the link on reload and made the
 * back button leave the view instead of stepping back a page.
 */
export function useDashboardPage(key = 'page'): readonly [number, (next: number) => void] {
  const [page, setPageQuery] = useQueryState(
    key,
    parseAsInteger.withDefault(1).withOptions({ scroll: false, history: 'replace' }),
  );
  const setPage = useCallback((next: number) => {
    void setPageQuery(next < 1 ? null : next);
  }, [setPageQuery]);
  const safePage = Number.isInteger(page) && page > 0 ? page : 1;
  return [safePage, setPage];
}
