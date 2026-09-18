'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import { Archive, ArrowRight, CircleCheck, CircleX, Copy, FileText, Globe, Images, Inbox, LayoutGrid, ListChecks, MoreVertical, Pencil, PenLine, RefreshCw, RotateCcw, SearchX, Send } from 'lucide-react';
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
  DashboardCollectionsSkeleton,
  DashboardContentSkeleton,
} from '@/modules/dashboard/components/dashboard-skeletons';
import type { View } from '@/modules/dashboard/components/dashboard-types';
import { getEditorConfig, type LookupTables } from '@/modules/dashboard/components/shared/record-editor-config';
import { RecordEditorForm } from '@/modules/dashboard/components/shared/record-editor-form';
import { cn } from '@/ui/cn';

const PAGE_SIZE = 10;

interface DataViewProps {
  readonly view: View;
  readonly data: unknown;
  readonly currentPage: number;
  readonly onPageChange: (page: number) => void;
  readonly onRefresh: () => void;
  /** Command dispatcher workspace; jika tidak ada, tabel menjadi read-only. */
  readonly command?: (action: string, payload: unknown) => Promise<unknown>;
  /** Pindah modul dari dalam konten (aksi cepat, panduan); jika tidak ada, tombol navigasi disembunyikan. */
  readonly onSelectView?: (view: View) => void;
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

/**
 * Render dashboard data collections.
 *
 * @remarks setState-in-effect: defer setEditing() to a microtask so setState stays async.
 */
export function DataView({
  view,
  data,
  currentPage,
  onPageChange,
  onRefresh,
  command,
  onSelectView,
}: DataViewProps) {
  const copyToClipboard = useCallback(async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`Tersalin ke clipboard: ${label}`);
    } catch {
      toast.error(`Gagal menyalin ${label}.`);
    }
  }, []);

  const [editing, setEditing] = useState<{ readonly collection: string; readonly id: string } | null>(null);

  useEffect(() => {
    void Promise.resolve().then(() => setEditing(null));
  }, [view]);

  const handlePageChange = useCallback(
    (page: number) => {
      setEditing(null);
      onPageChange(page);
    },
    [onPageChange],
  );

  const runTransition = useCallback(
    async (action: string, item: Record<string, unknown>) => {
      if (command === undefined) return;
      const result = await command(action, { id: item.id, expectedVersion: Number(item.version ?? 1) });
      if (result !== null) {
        setEditing(null);
        onRefresh();
      }
    },
    [command, onRefresh],
  );

  if (data === null || data === undefined) {
    return view === 'dashboard' ? <DashboardContentSkeleton /> : <DashboardCollectionsSkeleton />;
  }

  if (view === 'dashboard') {
    const dashboard = typeof data === 'object' ? (data as Record<string, unknown>) : {};
    const jobs = dashboard.jobsByState as Record<string, number> | undefined;

    const asNumber = (value: unknown): number => (typeof value === 'number' ? value : 0);
    const activeDomains = asNumber(dashboard.activeDomains);
    const activeSites = asNumber(dashboard.activeSites);
    const activeArticles = asNumber(dashboard.activeArticles);
    const archivedArticles = asNumber(dashboard.archivedArticles);
    const activeMedia = asNumber(dashboard.activeMedia);
    const successfulOutcomes = asNumber(dashboard.successfulSiteOutcomes);
    const failedOutcomes = asNumber(dashboard.failedSiteOutcomes);
    const outcomeTotal = successfulOutcomes + failedOutcomes;
    const successRate = outcomeTotal > 0 ? Math.round((successfulOutcomes / outcomeTotal) * 100) : 0;

    const metrics = [
      { key: 'domains', label: 'Domain Aktif', value: activeDomains, icon: Globe },
      { key: 'sites', label: 'Situs Aktif', value: activeSites, icon: LayoutGrid },
      { key: 'articles', label: 'Artikel Aktif', value: activeArticles, icon: FileText },
      { key: 'archived', label: 'Artikel Diarsipkan', value: archivedArticles, icon: Archive },
      { key: 'media', label: 'Media Aktif', value: activeMedia, icon: Images },
      { key: 'delivered', label: 'Penyaluran Berhasil', value: successfulOutcomes, icon: CircleCheck },
    ];

    const setupSteps: readonly { key: string; label: string; description: string; done: boolean; target: View }[] = [
      { key: 'domain', label: 'Hubungkan domain pertama', description: 'Sambungkan domain kontrol ke jaringan Indicate.', done: activeDomains > 0, target: 'configuration' },
      { key: 'site', label: 'Aktifkan situs pertama', description: 'Nyalakan portal berita di domain tersebut.', done: activeSites > 0, target: 'configuration' },
      { key: 'article', label: 'Terbitkan artikel pertama', description: 'Tulis naskah perdana dari ruang redaksi.', done: activeArticles > 0, target: 'editorial' },
      { key: 'delivery', label: 'Capai penyaluran berhasil pertama', description: 'Antrekan artikel ke situs dan pastikan terkirim.', done: successfulOutcomes > 0, target: 'publishing' },
    ];
    const completedSteps = setupSteps.filter((step) => step.done).length;

    const quickActions: readonly { target: View; label: string; description: string; icon: typeof Globe }[] = [
      { target: 'editorial', label: 'Tulis artikel', description: 'Naskah baru untuk jaringan', icon: PenLine },
      { target: 'publishing', label: 'Antrean penerbitan', description: 'Pantau status sindikasi', icon: Send },
      { target: 'media', label: 'Pustaka media', description: 'Kelola aset visual', icon: Images },
      { target: 'configuration', label: 'Domain & wilayah', description: 'Atur tenansi jaringan', icon: Globe },
    ];

    const jobEntries = jobs ? Object.entries(jobs) : [];
    const jobTotal = jobEntries.reduce((sum, [, count]) => sum + Number(count), 0);

    return (
      <div className="space-y-6">
        {completedSteps < setupSteps.length ? (
          <section
            aria-label="Panduan mulai cepat"
            className="rounded-lg border border-hairline bg-bg-raised p-5 sm:p-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="m-0 inline-flex items-center gap-2 font-sans text-sm font-semibold tracking-tight text-paper">
                <ListChecks className="h-4 w-4 text-brass" aria-hidden="true" />
                Panduan mulai cepat
              </h2>
              <p className="m-0 font-mono text-[11px] tabular-nums text-paper-faint">
                {completedSteps} dari {setupSteps.length} selesai
              </p>
            </div>
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-bg-raised-2" role="presentation">
              <div
                className="h-full rounded-full bg-brass transition-[width] duration-500 ease-out"
                style={{ width: `${(completedSteps / setupSteps.length) * 100}%` }}
              />
            </div>
            <ul className="m-0 mt-2 list-none p-0">
              {setupSteps.map((step) => (
                <li key={step.key} className="flex items-center gap-3 border-b border-hairline/60 py-2.5 last:border-0 last:pb-0">
                  {step.done ? (
                    <CircleCheck className="h-4 w-4 flex-none text-signal" aria-hidden="true" />
                  ) : (
                    <CircleX className="h-4 w-4 flex-none text-paper-faint" aria-hidden="true" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className={`m-0 truncate font-sans text-[13px] ${step.done ? 'text-paper-faint line-through' : 'font-medium text-paper'}`}>
                      {step.label}
                    </p>
                    <p className="m-0 font-sans text-xs text-paper-faint line-clamp-2">{step.description}</p>
                  </div>
                  {step.done || onSelectView === undefined ? null : (
                    <button
                      type="button"
                      onClick={() => onSelectView(step.target)}
                      className="inline-flex flex-none items-center gap-1 rounded-md px-2 py-1 font-sans text-xs font-medium text-brass transition-colors duration-150 hover:bg-bg-raised-2 hover:text-brass-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/60"
                    >
                      Buka
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* Tanpa m-0: anak langsung space-y-6, margin-bottom 24px datang dari sana.
            m-0 akan mengalahkan space-y di Tailwind v4 karena rule space memakai :where (spesifisitas nol). */}
        <dl className="grid min-w-0 grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-3">
          {metrics.map(({ key, label, value, icon: Icon }) => (
            <div key={key} className="min-w-0 overflow-hidden rounded-lg border border-hairline bg-bg-raised p-5 transition-colors duration-150 hover:border-hairline-strong">
              <dt className="flex min-w-0 items-center gap-1.5 font-sans text-xs font-medium text-paper-dim">
                <Icon className="h-3.5 w-3.5 flex-none text-brass" aria-hidden="true" />
                <span className="min-w-0 flex-1 break-words leading-snug">
                  {label}
                </span>
              </dt>
              <dd className="m-0 mt-1.5 truncate font-mono text-2xl font-bold tabular-nums tracking-tight text-paper" title={value.toLocaleString('id-ID')}>
                {value.toLocaleString('id-ID')}
              </dd>
            </div>
          ))}
        </dl>

        <div className={jobs ? 'grid min-w-0 gap-4 lg:grid-cols-5' : 'grid min-w-0 gap-4'}>
          {jobs ? (
            <section
              aria-label="Distribusi antrean sindikasi"
              className="min-w-0 overflow-hidden rounded-lg border border-hairline bg-bg-raised p-5 sm:p-6 lg:col-span-3"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-hairline pb-3">
                <h2 className="m-0 font-sans text-sm font-semibold tracking-tight text-paper">
                  Antrean sindikasi per status
                </h2>
                <p className="m-0 font-mono text-[11px] tabular-nums text-paper-faint">
                  {jobTotal.toLocaleString('id-ID')} tugas
                </p>
              </div>
              <ul className="m-0 grid list-none gap-0 p-0">
                {jobEntries.length === 0 ? (
                  <li className="py-6 text-center">
                    <p className="m-0 font-sans text-[13px] text-paper-dim">Belum ada tugas sindikasi.</p>
                    <p className="m-0 mt-1 font-sans text-xs text-paper-faint">
                      Tugas antrean akan terdaftar di sini setelah artikel pertama dijadwalkan.
                    </p>
                  </li>
                ) : (
                  jobEntries.map(([state, count]) => {
                  const meta = resolveStatus(state);
                  const pct = jobTotal > 0 ? (Number(count) / jobTotal) * 100 : 0;
                  return (
                    <li key={state} className="grid min-w-0 grid-cols-[minmax(0,5.5rem)_minmax(0,1fr)_auto] items-center gap-2 border-b border-hairline py-2.5 last:border-0 min-[480px]:grid-cols-[8rem_minmax(0,1fr)_auto] sm:gap-3">
                      <span className="inline-flex min-w-0 items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider">
                        <span className={cn('h-1.5 w-1.5 flex-none', STATUS_DOT[meta.tone])} aria-hidden="true" />
                        <span className={cn('min-w-0 flex-1 truncate', STATUS_TEXT[meta.tone])} title={meta.label}>{meta.label}</span>
                      </span>
                      <span className="h-1 min-w-0 overflow-hidden rounded-full bg-bg-raised-2" role="presentation">
                        <span
                          className={cn('block h-full rounded-full transition-[width] duration-500 ease-out', STATUS_DOT[meta.tone])}
                          style={{ width: `${Math.max(pct, 2)}%` }}
                        />
                      </span>
                      <span className="flex-none font-mono text-sm font-bold tabular-nums text-paper">
                        {Number(count).toLocaleString('id-ID')}
                      </span>
                    </li>
                  );
                })
              )}
              </ul>
            </section>
          ) : null}

          <section
            aria-label="Kesehatan penyaluran"
            className={jobs ? 'min-w-0 overflow-hidden rounded-lg border border-hairline bg-bg-raised p-5 sm:p-6 lg:col-span-2' : 'min-w-0 overflow-hidden rounded-lg border border-hairline bg-bg-raised p-5 sm:p-6'}
          >
            <h2 className="m-0 border-b border-hairline pb-3 font-sans text-sm font-semibold tracking-tight text-paper">
              Kesehatan penyaluran
            </h2>
            {outcomeTotal > 0 ? (
              <>
                <p className="m-0 mt-4 font-mono text-3xl font-bold tabular-nums tracking-tight text-paper">
                  {successRate}
                  <span className="text-base font-medium text-paper-faint">%</span>
                </p>
                <p className="m-0 mt-1 font-sans text-xs text-paper-dim">hasil situs berakhir sukses</p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-bg-raised-2" role="presentation">
                  <div
                    className="h-full rounded-full bg-signal transition-[width] duration-500 ease-out"
                    style={{ width: `${successRate}%` }}
                  />
                </div>
                <dl className="m-0 mt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <dt className="inline-flex items-center gap-1.5 font-sans text-xs text-paper-dim">
                      <CircleCheck className="h-3.5 w-3.5 text-signal" aria-hidden="true" />
                      Berhasil
                    </dt>
                    <dd className="m-0 font-mono text-sm font-bold tabular-nums text-paper">
                      {successfulOutcomes.toLocaleString('id-ID')}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="inline-flex items-center gap-1.5 font-sans text-xs text-paper-dim">
                      <CircleX className="h-3.5 w-3.5 text-error" aria-hidden="true" />
                      Gagal
                    </dt>
                    <dd className="m-0 font-mono text-sm font-bold tabular-nums text-paper">
                      {failedOutcomes.toLocaleString('id-ID')}
                    </dd>
                  </div>
                </dl>
              </>
            ) : (
              <p className="m-0 mt-4 font-sans text-[13px] leading-relaxed text-paper-dim">
                Belum ada hasil penyaluran. Hasil situs akan diringkas di sini setelah antrean pertama berjalan.
              </p>
            )}
          </section>
        </div>

        {onSelectView === undefined ? null : (
          <section aria-label="Aksi cepat">
            <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {quickActions.map(({ target, label, description, icon: Icon }) => (
                <button
                  key={target}
                  type="button"
                  onClick={() => onSelectView(target)}
                  className="group flex min-w-0 items-center gap-3 rounded-lg border border-hairline bg-bg-raised p-4 text-left transition-all duration-150 hover:border-hairline-strong active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/60"
                >
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-md bg-bg-raised-2 text-brass transition-colors duration-150 group-hover:bg-bg-raised-3">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-sans text-[13px] font-medium text-paper">{label}</span>
                    <span className="block truncate font-sans text-xs text-paper-faint">{description}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 flex-none text-paper-faint opacity-0 transition-all duration-150 group-hover:translate-x-0.5 group-hover:text-paper group-hover:opacity-100" aria-hidden="true" />
                </button>
              ))}
            </div>
          </section>
        )}
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

  const lookups: LookupTables = Object.fromEntries(collections);

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

        const editorConfig = command === undefined ? undefined : getEditorConfig(collectionKey);

        return (
          <section key={collectionKey} aria-label={formattedTitle} className="rounded-lg border border-hairline bg-bg-raised p-5 sm:p-6">
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
                      const transitions = (editorConfig?.transitions ?? []).filter(
                        (transition) => transition.whenStatus === undefined || transition.whenStatus.includes(status),
                      );
                      const isEditing = editing !== null && editing.collection === collectionKey && editing.id === itemId;

                      return (
                        <Fragment key={itemId}>
                        <TableRow
                          className="border-b border-hairline/60 transition-colors duration-180 hover:bg-bg-raised-2"
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
                                {editorConfig !== undefined ? (
                                  <DropdownMenuItem
                                    onClick={() => setEditing({ collection: collectionKey, id: itemId })}
                                    className="flex cursor-pointer items-center gap-2 px-2 py-1.5 text-xs text-paper-dim hover:text-paper"
                                  >
                                    <Pencil className="h-3.5 w-3.5 text-brass" aria-hidden="true" />
                                    <span>Ubah rekaman</span>
                                  </DropdownMenuItem>
                                ) : null}
                                {transitions.length > 0 ? (
                                  <>
                                    <DropdownMenuSeparator className="bg-hairline" />
                                    {transitions.map((transition) => (
                                      <DropdownMenuItem
                                        key={transition.action}
                                        onClick={() => void runTransition(transition.action, item)}
                                        className="flex cursor-pointer items-center gap-2 px-2 py-1.5 text-xs text-paper-dim hover:text-paper"
                                      >
                                        {transition.action.includes('archive') ? (
                                          <Archive className="h-3.5 w-3.5" aria-hidden="true" />
                                        ) : (
                                          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                                        )}
                                        <span>{transition.label}</span>
                                      </DropdownMenuItem>
                                    ))}
                                  </>
                                ) : null}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                        {isEditing && editorConfig !== undefined ? (
                          <TableRow className="border-b border-hairline/60 hover:bg-transparent">
                            <TableCell colSpan={3} className="p-0">
                              <RecordEditorForm
                                config={editorConfig}
                                collectionKey={collectionKey}
                                item={item}
                                lookups={lookups}
                                onSaved={() => {
                                  setEditing(null);
                                  onRefresh();
                                }}
                                onCancel={() => setEditing(null)}
                                onSubmit={async (action, payload) =>
                                  command === undefined ? null : command(action, payload)
                                }
                              />
                            </TableCell>
                          </TableRow>
                        ) : null}
                        </Fragment>
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
                          if (safePage > 1) handlePageChange(safePage - 1);
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
                          if (safePage < totalPages) handlePageChange(safePage + 1);
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
