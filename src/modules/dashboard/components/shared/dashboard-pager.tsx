'use client';

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

const EDGE_CLASS =
  'px-0 font-sans text-xs text-paper transition-colors hover:text-brass';

/**
 * Render the range counter and pager shared by every dashboard table.
 *
 * @param startIndex - Zero-based index of the first visible row.
 * @param visibleCount - Rows rendered on this page.
 * @param total - Rows matching the current filter.
 * @param page - Current 1-based page, already clamped to the page count.
 * @param pageCount - Total pages, at least 1.
 * @param noun - List name for the accessible labels; required when a page holds
 *   more than one pager, so a screen reader can tell them apart.
 * @param onPageChange - Receives the requested 1-based page.
 * @param note - Extra suffix on the range counter, such as a truncation hint.
 * @returns Pager row, or null when there is nothing to page through.
 * @remarks One component for the generic collection table, the editorial
 * archive, the published board, and the taxonomy manager, so the disabled edge
 * states and the counter wording cannot drift between them.
 */
export function DashboardPager({
  startIndex,
  visibleCount,
  total,
  page,
  pageCount,
  noun,
  onPageChange,
  note,
}: {
  readonly startIndex: number;
  readonly visibleCount: number;
  readonly total: number;
  readonly page: number;
  readonly pageCount: number;
  readonly noun?: string | undefined;
  readonly onPageChange: (page: number) => void;
  readonly note?: string | undefined;
}) {
  if (total === 0) return null;
  const atStart = page <= 1;
  const atEnd = page >= pageCount;
  const previousLabel = noun === undefined ? 'Ke halaman sebelumnya' : `Ke halaman ${noun} sebelumnya`;
  const nextLabel = noun === undefined ? 'Ke halaman berikutnya' : `Ke halaman ${noun} berikutnya`;
  const first = startIndex + 1;
  const last = startIndex + visibleCount;
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
      <span role="status" aria-live="polite" aria-atomic="true" className="font-mono text-[11px] tabular-nums text-paper-faint">
        {first}–{last} dari {total}
        {note === undefined || note === '' ? null : ` ${note}`}
      </span>
      <Pagination className="mx-0 w-auto">
        <PaginationContent className="gap-4">
          <PaginationItem>
            <PaginationPrevious
              text="Sebelumnya"
              href="#"
              aria-label={previousLabel}
              aria-disabled={atStart}
              tabIndex={atStart ? -1 : 0}
              onClick={(event) => {
                event.preventDefault();
                if (!atStart) onPageChange(page - 1);
              }}
              className={`${EDGE_CLASS} ${atStart ? 'pointer-events-none opacity-40' : 'cursor-pointer'}`}
            />
          </PaginationItem>
          <PaginationItem>
            <span className="font-mono text-[11px] tabular-nums text-paper-faint">
              {page} / {pageCount}
            </span>
          </PaginationItem>
          <PaginationItem>
            <PaginationNext
              text="Berikutnya"
              href="#"
              aria-label={nextLabel}
              aria-disabled={atEnd}
              tabIndex={atEnd ? -1 : 0}
              onClick={(event) => {
                event.preventDefault();
                if (!atEnd) onPageChange(page + 1);
              }}
              className={`${EDGE_CLASS} ${atEnd ? 'pointer-events-none opacity-40' : 'cursor-pointer'}`}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
