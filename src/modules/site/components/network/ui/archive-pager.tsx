'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import type { ArticleListItem } from '@/modules/delivery/models';

export const ARCHIVE_PAGE_SIZE = 9;

const PAGER_CONTROL_CLASSES =
  'inline-flex h-11 items-center gap-2 rounded-full border border-[var(--tpl-ring,#e2e8f0)] px-6 font-sans text-sm font-bold text-[var(--tpl-ink,#0f172a)] transition-colors hover:bg-[var(--tpl-primary-soft,#e8f0fe)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tpl-primary,#1a5fd0)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent';

const PAGER_TEXT_CLASSES = 'm-0 font-sans text-xs font-medium tabular-nums text-[var(--tpl-muted,#475569)]';

/**
 * One page window of a client-side archive.
 */
export interface ArchivePageRange {
  readonly page: number;
  readonly pageCount: number;
  readonly start: number;
  readonly end: number;
}

/**
 * Resolve the page window for a list length, clamping a stale page request.
 *
 * @param total - Total items available.
 * @param pageSize - Items per page; anything below one is treated as one.
 * @param page - Requested zero-based page, clamped into the available range.
 * @returns Clamped page, page count, and the one-based item range of that page.
 */
export function archivePageRange(total: number, pageSize: number, page: number): ArchivePageRange {
  const size = Math.max(1, Math.trunc(pageSize));
  const count = Math.max(0, total);
  if (count === 0) return { page: 0, pageCount: 0, start: 0, end: 0 };
  const pageCount = Math.ceil(count / size);
  const current = Math.min(Math.max(0, Math.trunc(page)), pageCount - 1);
  const start = current * size + 1;
  return { page: current, pageCount, start, end: Math.min(count, start + size - 1) };
}

/**
 * Client-side archive section with previous/next paging.
 *
 * @remarks
 * The whole list already arrived in the server payload, so paging stays in
 * component state: no request, no URL segment, and therefore no shareable
 * deep link. Sections shorter than one page render without controls.
 */
export interface TemplateArchivePagerProps {
  readonly articles: readonly ArticleListItem[];
  readonly label: string;
  readonly header: ReactNode;
  readonly renderCard: (article: ArticleListItem, index: number) => ReactNode;
  readonly gridClassName?: string | undefined;
  readonly pageSize?: number | undefined;
}

/**
 * Render one archive page of template cards plus its pager controls.
 *
 * @param props - Archive list, section label, heading node, card renderer, and optional grid/page tuning.
 * @returns The archive section, or `null` when the list is empty.
 */
export function TemplateArchivePager({
  articles,
  label,
  header,
  renderCard,
  gridClassName = 'md:grid-cols-3',
  pageSize = ARCHIVE_PAGE_SIZE,
}: TemplateArchivePagerProps) {
  const [requestedPage, setRequestedPage] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);
  const renderedPage = useRef(0);
  const { page, pageCount, start, end } = archivePageRange(articles.length, pageSize, requestedPage);
  const visible = articles.slice(start - 1, end);

  useEffect(() => {
    if (renderedPage.current === page) return;
    renderedPage.current = page;
    const section = sectionRef.current;
    if (section === null) return;
    section.focus();
    section.scrollIntoView?.({ block: 'start' });
  }, [page]);

  if (articles.length === 0) return null;

  return (
    <section ref={sectionRef} tabIndex={-1} aria-label={label} className="scroll-mt-20 focus:outline-none">
      <div className="flex items-end justify-between gap-4">
        {header}
        <p className={`m-0 flex-none ${PAGER_TEXT_CLASSES}`} role="status">
          {start}–{end}/{articles.length}
        </p>
      </div>

      <div className={`mt-5 grid items-stretch gap-5 ${gridClassName}`}>
        {visible.map((article, offset) => renderCard(article, start + offset))}
      </div>

      {pageCount > 1 ? (
        <nav aria-label={`Navigasi halaman ${label}`} className="mt-8 flex items-center justify-center gap-3 sm:gap-4">
          <button
            type="button"
            disabled={page === 0}
            onClick={() => setRequestedPage(page - 1)}
            className={PAGER_CONTROL_CLASSES}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Sebelumnya
          </button>
          <p className={PAGER_TEXT_CLASSES}>
            Halaman {page + 1} dari {pageCount}
          </p>
          <button
            type="button"
            disabled={page === pageCount - 1}
            onClick={() => setRequestedPage(page + 1)}
            className={PAGER_CONTROL_CLASSES}
          >
            Berikutnya
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </nav>
      ) : null}
    </section>
  );
}
