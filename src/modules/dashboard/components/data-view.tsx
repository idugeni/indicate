'use client';

import { Fragment, useMemo, useState } from 'react';
import { Archive, ArrowDown, ArrowRight, ArrowUp, ArrowUpDown, Check, CircleCheck, CircleX, Copy, Eye, FileText, Globe, Images, Inbox, LayoutGrid, ListChecks, MoreVertical, Network, Pencil, PenLine, RefreshCw, RotateCcw, SearchX, Send, SlidersHorizontal } from 'lucide-react';
import { flexRender, useTable } from '@tanstack/react-table';
import {
  columnVisibilityFeature,
  createSortedRowModel,
  rowSelectionFeature,
  rowSortingFeature,
  tableFeatures,
  type Column,
  type ColumnDef,
  type ColumnVisibilityState,
  type Row,
  type RowSelectionState,
  type SortingState,
} from '@tanstack/table-core';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import type { AnalyticsProjection } from '@/modules/dashboard/models';
import { GaleriTelemetri } from '@/modules/dashboard/components/analytics/galeri';
import { BentoUtama } from '@/modules/dashboard/components/analytics/bento-utama';
import { getEditorConfig, type EditorTransition, type LookupTables } from '@/modules/dashboard/components/shared/record-editor-config';
import { RecordEditorForm } from '@/modules/dashboard/components/shared/record-editor-form';
import { cn } from '@/ui/cn';

const PAGE_SIZE = 10;

function isAnalyticsProjection(value: unknown): value is AnalyticsProjection {
  if (typeof value !== 'object' || value === null) return false;
  return Array.isArray((value as Partial<AnalyticsProjection>).articlesByRegion);
}

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
  const status = String(rawStatus ?? 'unknown').toLowerCase();

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
    : String(item.id ?? 'Data');
}

/**
 * Render dashboard data collections.
 *
 * @remarks Koleksi generik dirender lewat tabel TanStack (sortir, seleksi, visibilitas kolom); paginasi tetap milik workspace agar sinkron dengan `?page=`.
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
  if (data === null || data === undefined) {
    return view === 'dashboard' ? <DashboardContentSkeleton /> : <DashboardCollectionsSkeleton />;
  }

  if (view === 'dashboard') {
    const dashboard = typeof data === 'object' ? (data as Record<string, unknown>) : {};
    const jobs = dashboard.jobsByState as Record<string, number> | undefined;

    const asNumber = (value: unknown): number => (typeof value === 'number' ? value : 0);
    const activeDomains = asNumber(dashboard.activeDomains);
    const activeSubdomains = asNumber(dashboard.activeSubdomains);
    const activeSites = asNumber(dashboard.activeSites);
    const activeArticles = asNumber(dashboard.activeArticles);
    const archivedArticles = asNumber(dashboard.archivedArticles);
    const activeMedia = asNumber(dashboard.activeMedia);
    const successfulOutcomes = asNumber(dashboard.successfulSiteOutcomes);
    const failedOutcomes = asNumber(dashboard.failedSiteOutcomes);
    const analytics = isAnalyticsProjection(dashboard.analytics) ? dashboard.analytics : null;

    const metrics = [
      { key: 'domains', label: 'Domain Utama', value: activeDomains, icon: Globe },
      { key: 'subdomains', label: 'Subdomain', value: activeSubdomains, icon: Network },
      { key: 'sites', label: 'Total Situs', value: activeSites, icon: LayoutGrid },
      { key: 'articles', label: 'Artikel Tayang', value: activeArticles, icon: FileText },
      { key: 'archived', label: 'Artikel Arsip', value: archivedArticles, icon: Archive },
      { key: 'media', label: 'Media', value: activeMedia, icon: Images },
      { key: 'delivered', label: 'Penyaluran Berhasil', value: successfulOutcomes, icon: CircleCheck },
      { key: 'views', label: 'Total Tayangan', value: analytics?.totalViews ?? 0, icon: Eye },
    ];

    const setupSteps: readonly { key: string; label: string; description: string; done: boolean; target: View }[] = [
      { key: 'domain', label: 'Daftarkan domain utama', description: 'Sambungkan domain utama Anda ke jaringan Indicate.', done: activeDomains > 0, target: 'configuration' },
      { key: 'site', label: 'Aktifkan subdomain pertama', description: 'Buat situs wilayah di bawah domain utama, mis. semarang.domainanda.id.', done: activeSites > 0, target: 'configuration' },
      { key: 'article', label: 'Terbitkan artikel pertama', description: 'Tulis artikel perdana dari ruang redaksi.', done: activeArticles > 0, target: 'editorial' },
      { key: 'delivery', label: 'Capai pengiriman berhasil pertama', description: 'Kirim artikel ke situs dan pastikan tiba.', done: successfulOutcomes > 0, target: 'publishing' },
    ];
    const completedSteps = setupSteps.filter((step) => step.done).length;

    const quickActions: readonly { target: View; label: string; description: string; icon: typeof Globe }[] = [
      { target: 'editorial', label: 'Tulis Berita', description: 'Berita baru untuk jaringan', icon: PenLine },
      { target: 'publishing', label: 'Antrean Penerbitan', description: 'Pantau status pengiriman', icon: Send },
      { target: 'media', label: 'Media', description: 'Kelola foto & gambar', icon: Images },
      { target: 'configuration', label: 'Domain & Wilayah', description: 'Atur domain & subdomain wilayah', icon: Globe },
    ];

    return (
      <div className="grid min-w-0 grid-cols-1 gap-4 min-[420px]:grid-cols-6 lg:grid-cols-12">
        {completedSteps < setupSteps.length ? (
          <section
            aria-label="Panduan mulai cepat"
            className="col-span-full rounded-lg border border-hairline bg-bg-raised p-5 sm:p-6"
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
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => onSelectView(step.target)}
                      className="flex-none font-medium text-brass hover:text-brass-soft"
                    >
                      Buka
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <dl className="col-span-full grid min-w-0 grid-cols-1 gap-4 min-[420px]:grid-cols-12 lg:grid-cols-4">
          {metrics.map(({ key, label, value, icon: Icon }) => (
            <div key={key} className="min-w-0 overflow-hidden rounded-lg border border-hairline bg-bg-raised p-5 transition-colors duration-150 min-[420px]:col-span-6 hover:border-hairline-strong lg:col-span-1">
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

        <BentoUtama
          jobs={jobs ?? {}}
          berhasil={successfulOutcomes}
          gagal={failedOutcomes}
          aktif={activeArticles}
          arsip={archivedArticles}
          analytics={analytics}
        />

        {onSelectView === undefined ? null : (
          <section aria-label="Aksi cepat" className="col-span-full">
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
    if (view === 'operations') {
      return (
        <EmptyState
          title="Antrean kosong — tidak ada tugas tertunda"
          description="Semua pekerjaan sistem sudah selesai. Tugas baru akan muncul di sini saat tiba."
          icon={<CircleCheck className="h-5 w-5 text-signal" aria-hidden="true" />}
          action={
            <Button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center gap-2 border border-hairline-strong bg-transparent px-3 py-2 font-sans text-xs text-paper transition-colors duration-180 hover:border-paper-faint"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Periksa antrean
            </Button>
          }
        />
      );
    }
    return (
      <EmptyState
        title="Belum ada data"
        description="Belum ada data yang cocok dengan filter halaman ini. Longgarkan filter atau muat ulang dari server."
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

  if (view === 'analytics') {
    const projection = data as Partial<AnalyticsProjection>;
    if (Array.isArray(projection.articlesByRegion)) {
      return (
        <div className="space-y-10">
          <GaleriTelemetri data={projection as AnalyticsProjection} />
        </div>
      );
    }
  }

  return (
    <div className="space-y-10">
      {collections.map(([collectionKey, rawItems]) => (
        <CollectionTable
          key={collectionKey}
          collectionKey={collectionKey}
          rawItems={rawItems}
          lookups={lookups}
          currentPage={currentPage}
          onPageChange={onPageChange}
          onRefresh={onRefresh}
          command={command}
        />
      ))}
    </div>
  );
}

type CollectionItem = Record<string, unknown>;

const dashboardFeatures = tableFeatures({
  rowSortingFeature,
  rowSelectionFeature,
  columnVisibilityFeature,
  sortedRowModel: createSortedRowModel(),
});

type DashboardFeatures = typeof dashboardFeatures;

/**
 * Render satu koleksi generik sebagai tabel interaktif.
 *
 * @remarks Sortir, seleksi baris, dan visibilitas kolom milik TanStack; paginasi tetap milik workspace agar sinkron dengan `?page=`.
 */
function CollectionTable({
  collectionKey,
  rawItems,
  lookups,
  currentPage,
  onPageChange,
  onRefresh,
  command,
}: {
  readonly collectionKey: string;
  readonly rawItems: readonly CollectionItem[];
  readonly lookups: LookupTables;
  readonly currentPage: number;
  readonly onPageChange: (page: number) => void;
  readonly onRefresh: () => void;
  readonly command: ((action: string, payload: unknown) => Promise<unknown>) | undefined;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibilityState>({});
  const [editingId, setEditingId] = useState<string | null>(null);

  const editorConfig = command === undefined ? undefined : getEditorConfig(collectionKey);
  const formattedTitle = collectionKey.replace(/([A-Z])/g, ' $1').trim();
  const memoData = useMemo(() => [...rawItems], [rawItems]);

  const copyToClipboard = async (text: string, label: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`Tersalin ke clipboard: ${label}`);
    } catch {
      toast.error(`Gagal menyalin ${label}.`);
    }
  };

  const runTransition = async (action: string, item: CollectionItem): Promise<void> => {
    if (command === undefined) return;
    const result = await command(action, { id: item.id, expectedVersion: Number(item.version ?? 1) });
    if (result !== null) {
      setEditingId(null);
      onRefresh();
    }
  };

  const table = useTable({
    features: dashboardFeatures,
    data: memoData,
    columns: [
      {
        id: 'select',
        enableSorting: false,
        enableHiding: false,
        header: ({ table: headerTable }) => (
          <Checkbox
            checked={headerTable.getIsAllPageRowsSelected()}
            indeterminate={headerTable.getIsSomePageRowsSelected()}
            onCheckedChange={(value) => headerTable.toggleAllPageRowsSelected(value)}
            aria-label="Pilih semua baris halaman ini"
            className="border-hairline-strong data-checked:border-brass data-checked:bg-brass data-checked:text-bg"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(value)}
            aria-label={`Pilih ${resolveItemName(row.original)}`}
            className="border-hairline-strong data-checked:border-brass data-checked:bg-brass data-checked:text-bg"
          />
        ),
      },
      {
        id: 'name',
        accessorFn: (item) => resolveItemName(item),
        header: ({ column }) => <SortHeader label="Nama" column={column} />,
        cell: ({ row }) => {
          const name = resolveItemName(row.original);
          return (
            <>
              <div className="font-sans font-medium text-paper">
                {name}
              </div>
              <div className="mt-0.5 font-mono text-[11px] tabular-nums text-paper-faint">
                {row.id}
              </div>
            </>
          );
        },
      },
      {
        id: 'status',
        accessorFn: (item) => String(item.status ?? item.state ?? item.verificationStatus ?? 'unknown'),
        header: ({ column }) => <SortHeader label="Status" column={column} />,
        cell: ({ getValue }) => <StatusMark status={String(getValue())} />,
      },
      {
        id: 'actions',
        enableSorting: false,
        enableHiding: false,
        header: () => <span className="sr-only">Aksi</span>,
        cell: ({ row }) => {
          const item = row.original;
          const itemId = row.id;
          const name = resolveItemName(item);
          const status = String(item.status ?? item.state ?? item.verificationStatus ?? 'unknown');
          const transitions = (editorConfig?.transitions ?? []).filter(
            (transition) => transition.whenStatus === undefined || transition.whenStatus.includes(status),
          );
          return (
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
                    onClick={() => setEditingId(itemId)}
                    className="flex cursor-pointer items-center gap-2 px-2 py-1.5 text-xs text-paper-dim hover:text-paper"
                  >
                    <Pencil className="h-3.5 w-3.5 text-brass" aria-hidden="true" />
                    <span>Ubah data</span>
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
          );
        },
      },
    ] satisfies ColumnDef<DashboardFeatures, CollectionItem>[],
    state: { sorting, rowSelection, columnVisibility },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    getRowId: (original, index) => String(original.id ?? `${collectionKey}-${index}`),
  });

  const totalItems = rawItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const pageRows = table.getSortedRowModel().rows.slice(startIndex, startIndex + PAGE_SIZE);
  const selectedRows = table.getSelectedRowModel().rows;
  const selectedCount = selectedRows.length;

  const statusOf = (row: Row<DashboardFeatures, CollectionItem>): string =>
    String(row.original.status ?? row.original.state ?? row.original.verificationStatus ?? 'unknown');
  const commonTransitions: readonly EditorTransition[] = (editorConfig?.transitions ?? []).filter(
    (transition) =>
      selectedCount > 0 &&
      selectedRows.every((row) => transition.whenStatus === undefined || transition.whenStatus.includes(statusOf(row))),
  );

  const handlePageChange = (page: number): void => {
    setEditingId(null);
    onPageChange(page);
  };

  const copySelected = async (): Promise<void> => {
    const ids = selectedRows.map((row) => String(row.original.id ?? row.id));
    try {
      await navigator.clipboard.writeText(ids.join('\n'));
      toast.success(`${ids.length} ID tersalin ke clipboard.`);
    } catch {
      toast.error('Gagal menyalin ID terpilih.');
    }
  };

  const runBulk = async (transition: EditorTransition, rows: readonly Row<DashboardFeatures, CollectionItem>[]): Promise<void> => {
    if (command === undefined) return;
    let berhasil = 0;
    try {
      await toast.promise(
        (async () => {
          for (const row of rows) {
            const result = await command(transition.action, {
              id: row.original.id,
              expectedVersion: Number(row.original.version ?? 1),
            });
            if (result !== null) berhasil += 1;
          }
          if (berhasil === 0) throw new Error(`Aksi ${transition.label} gagal untuk semua ${rows.length} baris.`);
          return berhasil;
        })(),
        {
          loading: `Menjalankan ${transition.label} untuk ${rows.length} baris…`,
          success: (jumlah) => `${transition.label}: ${jumlah} dari ${rows.length} baris berhasil.`,
          error: (cause) => (cause instanceof Error ? cause.message : `Aksi ${transition.label} gagal.`),
        },
      );
    } catch {
      /* Toast galat sudah tampil; abaikan penolakan lanjutan. */
    }
    setEditingId(null);
    setRowSelection({});
    onRefresh();
  };

  return (
    <section key={collectionKey} aria-label={formattedTitle} className="rounded-lg border border-hairline bg-bg-raised p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-hairline pb-3">
        <h2 className="m-0 font-sans text-sm font-semibold tracking-tight text-paper">
          {formattedTitle}
        </h2>
        <div className="flex items-center gap-3">
          <p className="m-0 font-mono text-[11px] tabular-nums text-paper-faint">
            {totalItems.toLocaleString('id-ID')} data
          </p>
          {totalItems > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="Alihkan kolom tabel"
                className="inline-flex h-7 items-center gap-1.5 rounded border border-hairline px-2 font-sans text-[11px] text-paper-dim transition-colors duration-180 hover:border-hairline-strong hover:text-paper focus:outline-none"
              >
                <SlidersHorizontal className="h-3 w-3" aria-hidden="true" />
                Kolom
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="border border-hairline bg-bg-raised p-1 font-sans text-xs shadow-none"
              >
                {table
                  .getAllLeafColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => (
                    <DropdownMenuItem
                      key={column.id}
                      onClick={() => column.toggleVisibility()}
                      className="flex cursor-pointer items-center gap-2 px-2 py-1.5 text-xs text-paper-dim hover:text-paper"
                    >
                      <span
                        aria-hidden="true"
                        className={`flex h-3.5 w-3.5 items-center justify-center rounded-[3px] border ${column.getIsVisible() ? 'border-brass bg-brass text-bg' : 'border-hairline-strong'}`}
                      >
                        {column.getIsVisible() ? <Check className="h-3 w-3" aria-hidden="true" /> : null}
                      </span>
                      <span>{column.id === 'name' ? 'Nama' : 'Status'}</span>
                    </DropdownMenuItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>

      {selectedCount > 0 ? (
        <div role="status" className="mt-3 flex flex-wrap items-center gap-2 rounded-md border border-hairline-strong bg-bg px-3 py-2">
          <span className="font-mono text-[11px] tabular-nums text-paper-dim">
            {selectedCount} baris terpilih
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void copySelected()}
          >
            <Copy className="h-3 w-3" aria-hidden="true" />
            Salin ID
          </Button>
          {commonTransitions.map((transition) => (
            <Button
              key={transition.action}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void runBulk(transition, selectedRows)}
              className="border-brass/60"
            >
              {transition.label} ({selectedCount})
            </Button>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setRowSelection({})}
            className="text-paper-faint hover:text-paper"
          >
            Batal
          </Button>
        </div>
      ) : null}

      {totalItems === 0 ? (
        <EmptyState
          title="Belum ada data"
          description={`Belum ada data ${formattedTitle}. Buat data pertama lewat formulir di halaman ini, atau muat ulang.`}
          icon={<Inbox className="h-5 w-5 text-paper-faint" aria-hidden="true" />}
          action={
            <Button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center gap-2 border border-hairline-strong bg-transparent px-3 py-2 font-sans text-xs text-paper transition-colors duration-180 hover:border-paper-faint"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Muat ulang
            </Button>
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <Table className="w-full text-sm">
            <caption className="sr-only">
              {formattedTitle}: {totalItems.toLocaleString('id-ID')} data, halaman {safePage} dari {totalPages}
            </caption>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="border-b border-hairline hover:bg-transparent">
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className={
                        header.column.id === 'actions'
                          ? 'w-12 text-right font-mono text-[11px] font-medium uppercase tracking-wider text-paper-faint'
                          : 'font-mono text-[11px] font-medium uppercase tracking-wider text-paper-faint'
                      }
                    >
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {pageRows.map((row) => {
                const item = row.original;
                const itemId = row.id;
                const isEditing = editingId === itemId;
                return (
                  <Fragment key={itemId}>
                    <TableRow className="border-b border-hairline/60 transition-colors duration-180 hover:bg-bg-raised-2">
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className={cell.column.id === 'actions' ? 'py-3 text-right' : 'py-3'}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                    {isEditing && editorConfig !== undefined ? (
                      <TableRow className="border-b border-hairline/60 hover:bg-transparent">
                        <TableCell colSpan={4} className="p-0">
                          <RecordEditorForm
                            config={editorConfig}
                            collectionKey={collectionKey}
                            item={item}
                            lookups={lookups}
                            onSaved={() => {
                              setEditingId(null);
                              onRefresh();
                            }}
                            onCancel={() => setEditingId(null)}
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
}

/**
 * Tombol kepala kolom yang mengalihkan arah sortir TanStack.
 *
 * @param label - Nama kolom yang tampil.
 * @param column - Kolom TanStack yang bisa disortir.
 * @returns Tombol sortir dengan ikon arah aktif.
 */
function SortHeader({
  label,
  column,
}: {
  readonly label: string;
  readonly column: Column<DashboardFeatures, CollectionItem>;
}) {
  const sorted = column.getIsSorted();
  const Icon = sorted === 'asc' ? ArrowUp : sorted === 'desc' ? ArrowDown : ArrowUpDown;
  return (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      onClick={column.getToggleSortingHandler()}
      aria-label={`Urutkan ${label}`}
      className="font-mono text-[11px] font-medium uppercase tracking-wider text-paper-faint hover:text-paper"
    >
      {label}
      <Icon className="h-3 w-3" aria-hidden="true" />
    </Button>
  );
}
