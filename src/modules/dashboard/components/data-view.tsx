'use client';

import { useCallback } from 'react';
import { CheckCircle2, Copy, Inbox, MoreVertical, RefreshCw, SearchX } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/modules/dashboard/components/empty-state';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DashboardStatsSkeleton,
  DashboardTableSkeleton,
} from '@/modules/dashboard/components/dashboard-skeletons';
import type { View } from '@/modules/dashboard/components/dashboard-types';
import { cn } from '@/ui/cn';

const PAGE_SIZE = 10;

interface DataViewProps {
  readonly view: View;
  readonly data: unknown;
  readonly currentPage: number;
  readonly onPageChange: (page: number) => void;
  readonly onRefresh: () => void;
}

type StatusTone = 'ok' | 'bad' | 'busy' | 'idle';

function resolveStatus(rawStatus: unknown): { readonly label: string; readonly tone: StatusTone } {
  const status = String(rawStatus ?? 'active').toLowerCase();

  switch (status) {
    case 'active':
    case 'published':
    case 'verified':
    case 'success':
    case 'healthy':
      return { label: status, tone: 'ok' };
    case 'failed':
    case 'error':
    case 'rejected':
    case 'suspended':
      return { label: status, tone: 'bad' };
    case 'pending':
    case 'processing':
    case 'queued':
    case 'retrying':
      return { label: status, tone: 'busy' };
    default:
      return { label: status, tone: 'idle' };
  }
}

const STATUS_DOT: Record<StatusTone, string> = {
  ok: 'bg-signal',
  bad: 'bg-error',
  busy: 'bg-warning',
  idle: 'bg-paper-faint',
};

const STATUS_TEXT: Record<StatusTone, string> = {
  ok: 'text-signal',
  bad: 'text-error',
  busy: 'text-warning',
  idle: 'text-paper-dim',
};

function StatusMark({ status }: { readonly status: string }) {
  const meta = resolveStatus(status);
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider">
      <span className={cn('h-1.5 w-1.5', STATUS_DOT[meta.tone])} aria-hidden="true" />
      <span className={STATUS_TEXT[meta.tone]}>{meta.label}</span>
    </span>
  );
}

function resolveItemName(item: Record<string, unknown>): string {
  const possibleName =
    item.name ??
    item.title ??
    item.displayName ??
    item.action ??
    item.key ??
    item.normalizedHostname ??
    (item.customer as { name?: string } | undefined)?.name;

  return typeof possibleName === 'string' && possibleName.trim()
    ? possibleName.trim()
    : String(item.id ?? 'Rekaman Data');
}

export function DataView({
  view,
  data,
  currentPage,
  onPageChange,
  onRefresh,
}: DataViewProps) {
  const copyToClipboard = useCallback(async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`Tersalin ke clipboard: ${label}`);
    } catch {
      toast.error(`Gagal menyalin ${label}.`);
    }
  }, []);

  if (data === null || data === undefined) {
    return (
      <div className="space-y-8" aria-busy="true" aria-label="Memuat data modul">
        <DashboardStatsSkeleton />
        <DashboardTableSkeleton />
      </div>
    );
  }

  if (view === 'dashboard') {
    const dashboard = typeof data === 'object' ? (data as Record<string, unknown>) : {};
    const jobs = dashboard.jobsByState as Record<string, number> | undefined;

    const numericMetrics = Object.entries(dashboard).filter(
      ([, value]) => typeof value === 'number'
    );

    const jobEntries = jobs ? Object.entries(jobs) : [];
    const jobTotal = jobEntries.reduce((sum, [, count]) => sum + Number(count), 0);

    return (
      <div className="space-y-10">
        {numericMetrics.length > 0 ? (
          <dl className="m-0 grid grid-cols-2 gap-x-6 gap-y-6 lg:grid-cols-4">
            {numericMetrics.map(([key, value]) => {
              const formattedTitle = key
                .replace(/([A-Z])/g, ' $1')
                .trim();

              return (
                <div key={key} className="border-l-2 border-hairline-strong pl-3.5">
                  <dt className="font-mono text-[11px] uppercase tracking-wider text-paper-faint">
                    {formattedTitle}
                  </dt>
                  <dd className="m-0 mt-1.5 font-mono text-2xl font-bold tabular-nums text-paper">
                    {Number(value).toLocaleString('id-ID')}
                  </dd>
                </div>
              );
            })}
          </dl>
        ) : null}

        {jobs ? (
          <section aria-label="Distribusi antrean sindikasi">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="m-0 font-sans text-sm font-semibold tracking-tight text-paper">
                Antrean sindikasi per status
              </h2>
              <p className="m-0 font-mono text-[11px] tabular-nums text-paper-faint">
                {jobTotal.toLocaleString('id-ID')} tugas
              </p>
            </div>
            <ul className="m-0 mt-3 grid list-none gap-0 border-t border-hairline p-0">
              {jobEntries.map(([state, count]) => {
                const meta = resolveStatus(state);
                const pct = jobTotal > 0 ? (Number(count) / jobTotal) * 100 : 0;
                return (
                  <li key={state} className="grid grid-cols-[8rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-hairline py-2.5">
                    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider">
                      <span className={cn('h-1.5 w-1.5', STATUS_DOT[meta.tone])} aria-hidden="true" />
                      <span className={STATUS_TEXT[meta.tone]}>{meta.label}</span>
                    </span>
                    <span className="h-1 bg-bg-raised-2" role="presentation">
                      <span
                        className={cn('block h-full', STATUS_DOT[meta.tone])}
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </span>
                    <span className="font-mono text-sm font-bold tabular-nums text-paper">
                      {Number(count).toLocaleString('id-ID')}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </div>
    );
  }

  const normalizedSource: Record<string, unknown> = Array.isArray(data)
    ? { records: data }
    : typeof data === 'object' && data !== null
      ? (data as Record<string, unknown>)
      : {};

  const collections = Object.entries(normalizedSource).filter(([, val]) => Array.isArray(val)) as [
    string,
    Record<string, unknown>[],
  ][];

  if (collections.length === 0) {
    return (
      <EmptyState
        title="Tidak ada rekaman data"
        description="Belum ada data yang tercatat atau cocok dengan parameter filter modul ini. Longgarkan filter atau muat ulang dari PostgreSQL."
        icon={<SearchX className="h-5 w-5 text-paper-faint" aria-hidden="true" />}
        action={
          <Button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-2 border border-hairline-strong bg-transparent px-3 py-2 font-sans text-xs text-paper transition-colors duration-180 hover:border-paper-faint"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Muat ulang data
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-10">
      {collections.map(([collectionKey, rawItems]) => {
        const totalItems = rawItems.length;
        const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
        const safePage = Math.min(Math.max(1, currentPage), totalPages);
        const startIndex = (safePage - 1) * PAGE_SIZE;
        const paginatedItems = rawItems.slice(startIndex, startIndex + PAGE_SIZE);

        const formattedTitle = collectionKey
          .replace(/([A-Z])/g, ' $1')
          .trim();

        return (
          <section key={collectionKey} aria-label={formattedTitle}>
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-hairline pb-3">
              <h2 className="m-0 font-sans text-sm font-semibold tracking-tight text-paper">
                {formattedTitle}
              </h2>
              <p className="m-0 font-mono text-[11px] tabular-nums text-paper-faint">
                {totalItems.toLocaleString('id-ID')} entitas
              </p>
            </div>

            {totalItems === 0 ? (
              <EmptyState
                title="Koleksi kosong"
                description={`Tidak ada rekaman untuk koleksi ${collectionKey}. Buat entitas pertama melalui formulir modul ini, atau segarkan untuk memeriksa antrean ingress.`}
                icon={<Inbox className="h-5 w-5 text-paper-faint" aria-hidden="true" />}
                action={
                  <Button
                    type="button"
                    onClick={onRefresh}
                    className="inline-flex items-center gap-2 border border-hairline-strong bg-transparent px-3 py-2 font-sans text-xs text-paper transition-colors duration-180 hover:border-paper-faint"
                  >
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                    Segarkan koleksi
                  </Button>
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <Table className="w-full text-sm">
                  <caption className="sr-only">
                    {formattedTitle}: {totalItems.toLocaleString('id-ID')} entitas, halaman {safePage} dari {totalPages}
                  </caption>
                  <TableHeader>
                    <TableRow className="border-b border-hairline hover:bg-transparent">
                      <TableHead className="font-mono text-[11px] font-medium uppercase tracking-wider text-paper-faint">
                        Nama
                      </TableHead>
                      <TableHead className="font-mono text-[11px] font-medium uppercase tracking-wider text-paper-faint">
                        Status
                      </TableHead>
                      <TableHead className="w-12 text-right font-mono text-[11px] font-medium uppercase tracking-wider text-paper-faint">
                        <span className="sr-only">Aksi</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedItems.map((item, index) => {
                      const itemId = String(item.id ?? `${collectionKey}-${startIndex + index}`);
                      const name = resolveItemName(item);
                      const status = String(item.status ?? item.state ?? item.verificationStatus ?? 'active');

                      return (
                        <TableRow
                          key={itemId}
                          className="border-b border-hairline/60 transition-colors duration-180 hover:bg-bg-raised/40"
                        >
                          <TableCell className="py-3">
                            <div className="font-sans font-medium text-paper">
                              {name}
                            </div>
                            <div className="mt-0.5 font-mono text-[11px] tabular-nums text-paper-faint">
                              {itemId}
                            </div>
                          </TableCell>

                          <TableCell className="py-3">
                            <StatusMark status={status} />
                          </TableCell>

                          <TableCell className="py-3 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                className="inline-flex h-7 w-7 items-center justify-center text-paper-faint transition-colors duration-180 hover:bg-bg-raised-2 hover:text-paper focus:outline-none"
                                aria-label={`Aksi untuk ${name}`}
                                title={`Aksi untuk ${name}`}
                              >
                                <MoreVertical className="h-4 w-4" aria-hidden="true" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="border border-hairline bg-bg-raised p-1 font-sans text-xs shadow-none"
                              >
                                <DropdownMenuLabel className="px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-paper-faint">
                                  Opsi data
                                </DropdownMenuLabel>
                                <DropdownMenuItem
                                  onClick={() => void copyToClipboard(itemId, `ID: ${itemId}`)}
                                  className="flex cursor-pointer items-center gap-2 px-2 py-1.5 text-xs text-paper-dim hover:text-paper"
                                >
                                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                                  <span>Salin ID</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-hairline" />
                                <DropdownMenuItem
                                  onClick={() => toast.success(`Data divalidasi: ${name}`)}
                                  className="flex cursor-pointer items-center gap-2 px-2 py-1.5 text-xs text-paper-dim hover:text-paper"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5 text-signal" aria-hidden="true" />
                                  <span>Validasi record</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {totalItems > 0 ? (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <span role="status" aria-live="polite" aria-atomic="true" className="font-mono text-[11px] tabular-nums text-paper-faint">
                  {startIndex + 1}–{Math.min(startIndex + PAGE_SIZE, totalItems)} dari{' '}
                  {totalItems}
                </span>

                <Pagination className="mx-0 w-auto">
                  <PaginationContent className="gap-4">
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        aria-label="Ke halaman sebelumnya"
                        aria-disabled={safePage <= 1}
                        tabIndex={safePage <= 1 ? -1 : 0}
                        onClick={(e) => {
                          e.preventDefault();
                          if (safePage > 1) onPageChange(safePage - 1);
                        }}
                        className={`px-0 font-sans text-xs text-paper transition-colors hover:text-brass ${
                          safePage <= 1 ? 'pointer-events-none opacity-40' : 'cursor-pointer'
                        }`}
                      />
                    </PaginationItem>
                    <PaginationItem>
                      <span className="font-mono text-[11px] tabular-nums text-paper-faint">
                        {safePage} / {totalPages}
                      </span>
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        aria-label="Ke halaman berikutnya"
                        aria-disabled={safePage >= totalPages}
                        tabIndex={safePage >= totalPages ? -1 : 0}
                        onClick={(e) => {
                          e.preventDefault();
                          if (safePage < totalPages) onPageChange(safePage + 1);
                        }}
                        className={`px-0 font-sans text-xs text-paper transition-colors hover:text-brass ${
                          safePage >= totalPages ? 'pointer-events-none opacity-40' : 'cursor-pointer'
                        }`}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
