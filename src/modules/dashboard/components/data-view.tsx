'use client';

import { useMemo, useState } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AppTooltip } from '@/ui/app-tooltip';
import { EmptyState } from '@/modules/dashboard/components/empty-state';
import { DashboardPager } from '@/modules/dashboard/components/shared/dashboard-pager';
import { ChartTip } from '@/modules/dashboard/components/shared/chart-tip';
import {
  COLLECTION_LIMITS,
  PAGE_SIZE,
  STATUS_BADGE_TONE,
  collectionLabel,
  isAnalyticsProjection,
  resolveItemName,
  resolveItemSubtitle,
  resolveRowStatus,
  resolveStatus,
} from '@/modules/dashboard/components/data-view-format';
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
import { TelemetryGallery } from '@/modules/dashboard/components/analytics/gallery';
import { PrimaryBento } from '@/modules/dashboard/components/analytics/primary-bento';
import { getEditorConfig, type EditorTransition, type LookupTables } from '@/modules/dashboard/components/shared/record-editor-config';
import { RecordEditorForm } from '@/modules/dashboard/components/shared/record-editor-form';
import { Progress } from '@/components/ui/progress';

interface DataViewProps {
  readonly view: View;
  readonly data: unknown;
  readonly currentPage: number;
  readonly onPageChange: (page: number) => void;
  readonly onRefresh: () => void;
  /**
   * Restrict rendering to these payload collections, in this order. Used by
   * tabbed views that own several collections and want each tab to show only
   * its own; omit it to render every array the payload carries.
   */
  readonly collections?: readonly string[];
  /** Workspace command dispatcher; when absent, the table becomes read-only. */
  readonly command?: (action: string, payload: unknown) => Promise<unknown>;
  /** Switch modules from inside content (quick actions, guides); when absent, navigation buttons are hidden. */
  readonly onSelectView?: (view: View) => void;
  /** Tenant scope for additive AI assists; absent disables them. */
  readonly organizationId?: string | undefined;
}

function StatusMark({ status }: { readonly status: string }) {
  const meta = resolveStatus(status);
  return (
    <Badge variant="outline" className={`font-mono text-[10px] uppercase tracking-wider ${STATUS_BADGE_TONE[meta.tone]}`}>
      {meta.label}
    </Badge>
  );
}

/**
 * Render dashboard data collections.
 *
 * @remarks Generic collections render through the TanStack table (sorting, selection, column visibility); pagination stays with the workspace to sync with `?page=`.
 */
export function DataView({
  view,
  data,
  currentPage,
  onPageChange,
  onRefresh,
  collections: onlyCollections,
  command,
  onSelectView,
  organizationId,
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
      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12">
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
            <Progress value={(completedSteps / setupSteps.length) * 100} aria-label="Kemajuan panduan mulai cepat" className="mt-3 min-w-0" />
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

        <dl className="col-span-full grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map(({ key, label, value, icon: Icon }) => (
            <div key={key} className="min-w-0 overflow-hidden rounded-lg border border-hairline bg-bg-raised p-5 transition-colors duration-150 hover:border-hairline-strong">
              <dt className="flex min-w-0 items-center gap-1.5 font-sans text-xs font-medium text-paper-dim">
                <Icon className="h-3.5 w-3.5 flex-none text-brass" aria-hidden="true" />
                <span className="min-w-0 flex-1 break-words leading-snug">
                  {label}
                </span>
              </dt>
              <ChartTip tip={value.toLocaleString('id-ID')}>
                <dd className="m-0 mt-1.5 truncate font-mono text-2xl font-bold tabular-nums tracking-tight text-paper">
                  {value.toLocaleString('id-ID')}
                </dd>
              </ChartTip>
            </div>
          ))}
        </dl>

        <PrimaryBento
          jobs={jobs ?? {}}
          succeeded={successfulOutcomes}
          failed={failedOutcomes}
          active={activeArticles}
          archived={archivedArticles}
          analytics={analytics}
          organizationId={organizationId}
        />

        {onSelectView === undefined ? null : (
          <section aria-label="Aksi cepat" className="col-span-full">
            <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {quickActions.map(({ target, label, description, icon: Icon }) => (
                <Button
                  key={target}
                  type="button"
                  variant="ghost"
                  onClick={() => onSelectView(target)}
                  className="group flex h-auto min-w-0 items-center justify-start gap-3 rounded-lg border border-hairline bg-bg-raised p-4 text-left transition-all duration-150 hover:border-hairline-strong active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/60"
                >
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-md bg-bg-raised-2 text-brass transition-colors duration-150 group-hover:bg-bg-raised-3">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-sans text-[13px] font-medium leading-snug text-paper">{label}</span>
                    <span className="mt-0.5 block truncate font-sans text-xs leading-relaxed text-paper-faint">{description}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 flex-none text-paper-faint opacity-0 transition-all duration-150 group-hover:translate-x-0.5 group-hover:text-paper group-hover:opacity-100" aria-hidden="true" />
                </Button>
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

  const allCollections = Object.entries(normalizedSource).filter(([, val]) => Array.isArray(val)) as [
    string,
    Record<string, unknown>[],
  ][];
  const collections = onlyCollections === undefined
    ? allCollections
    : (onlyCollections
        .filter((key): key is string => key in normalizedSource)
        .map((key) => [key, normalizedSource[key] as Record<string, unknown>[]] as [string, Record<string, unknown>[]]));

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
          <TelemetryGallery data={projection as AnalyticsProjection} />
        </div>
      );
    }
  }

  const renderTable = (collectionKey: string, rawItems: readonly CollectionItem[], showTitle = true) => (
    <CollectionTable
      key={collectionKey}
      collectionKey={collectionKey}
      rawItems={rawItems}
      lookups={lookups}
      currentPage={currentPage}
      onPageChange={onPageChange}
      onRefresh={onRefresh}
      command={command}
      showTitle={showTitle}
      compactEmpty={collections.length > 1}
    />
  );

  const [primaryCollection, ...referenceCollections] = collections;
  const singleReference = referenceCollections.length === 1 ? referenceCollections[0] : undefined;
  const firstReference = referenceCollections[0];

  if (view === 'publishers' && primaryCollection !== undefined && firstReference !== undefined) {
    const [primaryKey, primaryItems] = primaryCollection;
    const [referenceKey, referenceItems] = singleReference ?? firstReference;
    return (
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <div className="min-w-0 space-y-3">
          <div className="border-b border-hairline pb-2">
            <h2 className="m-0 font-sans text-sm font-semibold tracking-tight text-paper">
              Penerbit
            </h2>
            <p className="m-0 mt-0.5 font-mono text-[11px] tabular-nums text-paper-faint">
              Lembaga yang memasok berita ke jaringan, satu baris per lembaga.
            </p>
          </div>
          {renderTable(primaryKey, primaryItems, false)}
        </div>
        <div className="min-w-0 space-y-3">
          <div className="border-b border-hairline pb-2">
            <h2 className="m-0 font-sans text-sm font-semibold tracking-tight text-paper">
              Keterkaitan penerbit &amp; portal
            </h2>
            <p className="m-0 mt-0.5 font-mono text-[11px] tabular-nums text-paper-faint">
              Afiliasi resmi: satu baris per klaim institusi di satu kota, bukan per portal.
            </p>
          </div>
          {renderTable(referenceKey, referenceItems, false)}
        </div>
      </div>
    );
  }

  return <div className="space-y-6">{collections.map(([collectionKey, items]) => renderTable(collectionKey, items))}</div>;
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
 * Render one generic collection as an interactive table.
 *
 * @remarks Row sorting, selection, and column visibility belong to TanStack; pagination stays with the workspace to sync with `?page=`.
 */
function CollectionTable({
  collectionKey,
  rawItems,
  lookups,
  currentPage,
  onPageChange,
  onRefresh,
  command,
  showTitle = true,
  compactEmpty = false,
}: {
  readonly collectionKey: string;
  readonly rawItems: readonly CollectionItem[];
  readonly lookups: LookupTables;
  readonly currentPage: number;
  readonly onPageChange: (page: number) => void;
  readonly onRefresh: () => void;
  readonly command: ((action: string, payload: unknown) => Promise<unknown>) | undefined;
  /** Set false when a wrapping section already names the table. */
  readonly showTitle?: boolean;
  /**
   * True when other collections share the page. An empty sidecar table then gets
   * a one-line note instead of a full-page empty block.
   */
  readonly compactEmpty?: boolean;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibilityState>({});
  const [editingId, setEditingId] = useState<string | null>(null);

  const editorConfig = command === undefined ? undefined : getEditorConfig(collectionKey);
  const formattedTitle = collectionLabel(collectionKey);
  const memoData = useMemo(() => [...rawItems], [rawItems]);
  const hasStatusSignal = useMemo(() => memoData.some((item) => resolveRowStatus(item) !== 'unknown'), [memoData]);
  // `site_settings` and similar projections carry no status field at all, so the
  // column would render `UNKNOWN` on every row forever; default it off instead.
  const effectiveColumnVisibility = useMemo<ColumnVisibilityState>(
    () => (hasStatusSignal ? columnVisibility : { status: false, ...columnVisibility }),
    [hasStatusSignal, columnVisibility],
  );

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
        cell: ({ row, table: cellTable }) => {
          const name = resolveItemName(row.original);
          const subtitle = resolveItemSubtitle(row.original);
          const status = resolveRowStatus(row.original);
          const statusColumnVisible = cellTable.getColumn('status')?.getIsVisible() ?? true;
          return (
            <div className="min-w-0">
              <div className="truncate font-sans font-medium text-paper">
                {name}
              </div>
              {subtitle === null ? null : (
                <div className="mt-0.5 truncate font-mono text-[11px] text-paper-faint">
                  {subtitle}
                </div>
              )}
              {status === '' || !statusColumnVisible ? null : (
                <div className="mt-0.5 sm:hidden">
                  <StatusMark status={status} />
                </div>
              )}
            </div>
          );
        },
      },
      {
        id: 'status',
        accessorFn: (item) => resolveRowStatus(item),
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
          const status = resolveRowStatus(item);
          const transitions = (editorConfig?.transitions ?? []).filter(
            (transition) => transition.whenStatus === undefined || transition.whenStatus.includes(status),
          );
          return (
            <DropdownMenu>
              <AppTooltip label={`Aksi untuk ${name}`}>
                <DropdownMenuTrigger
                  className="inline-flex h-7 w-7 items-center justify-center text-paper-faint transition-colors duration-180 hover:bg-bg-raised-2 hover:text-paper focus:outline-none"
                  aria-label={`Aksi untuk ${name}`}
                >
                  <MoreVertical className="h-4 w-4" aria-hidden="true" />
                </DropdownMenuTrigger>
              </AppTooltip>
              <DropdownMenuContent
                align="end"
                className="border border-hairline bg-bg-raised p-1 font-sans text-xs shadow-none"
              >
                <DropdownMenuGroup>
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
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ] satisfies ColumnDef<DashboardFeatures, CollectionItem>[],
    state: { sorting, rowSelection, columnVisibility: effectiveColumnVisibility },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    getRowId: (original, index) => String(original.id ?? `${collectionKey}-${index}`),
  });

  const totalItems = rawItems.length;
  const collectionLimit = COLLECTION_LIMITS[collectionKey];
  const isTruncated = collectionLimit !== undefined && totalItems >= collectionLimit;
  const itemCountLabel = isTruncated
    ? `${totalItems.toLocaleString('id-ID')} terbaru`
    : `${totalItems.toLocaleString('id-ID')} data`;
  const visibleColumnCount = table.getVisibleLeafColumns().length;  const editingItem =
    editingId === null
      ? null
      : (memoData.find(
          (entry, index) => String(entry.id ?? `${collectionKey}-${index}`) === editingId,
        ) ?? null);
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const pageRows = table.getSortedRowModel().rows.slice(startIndex, startIndex + PAGE_SIZE);
  const selectedRows = table.getSelectedRowModel().rows;
  const selectedCount = selectedRows.length;

  const statusOf = (row: Row<DashboardFeatures, CollectionItem>): string => resolveRowStatus(row.original);
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
    let succeeded = 0;
    try {
      await toast.promise(
        (async () => {
          for (const row of rows) {
            const result = await command(transition.action, {
              id: row.original.id,
              expectedVersion: Number(row.original.version ?? 1),
            });
            if (result !== null) succeeded += 1;
          }
          if (succeeded === 0) throw new Error(`Aksi ${transition.label} gagal untuk semua ${rows.length} baris.`);
          return succeeded;
        })(),
        {
          loading: `Menjalankan ${transition.label} untuk ${rows.length} baris…`,
          success: (count) => `${transition.label}: ${count} dari ${rows.length} baris berhasil.`,
          error: (cause) => (cause instanceof Error ? cause.message : `Aksi ${transition.label} gagal.`),
        },
      );
    } catch {
      /* Error toast already shown; ignore follow-up rejections. */
    }
    setEditingId(null);
    setRowSelection({});
    onRefresh();
  };

  return (
    <section key={collectionKey} aria-label={formattedTitle} className="min-w-0 rounded-lg border border-hairline bg-bg-raised p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-hairline pb-3">
        {showTitle ? (
          <h2 className="m-0 font-sans text-sm font-semibold tracking-tight text-paper">
            {formattedTitle}
          </h2>
        ) : (
          <p className="m-0 font-mono text-[11px] tabular-nums text-paper-faint">
            {itemCountLabel}
          </p>
        )}
        <div className="flex items-center gap-3">
          {showTitle ? (
            <p className="m-0 font-mono text-[11px] tabular-nums text-paper-faint">
              {itemCountLabel}
            </p>
          ) : null}
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
        compactEmpty ? (
          <p role="status" aria-live="polite" className="m-0 font-sans text-[11px] text-paper-faint">
            {`${formattedTitle} — tidak ada entri.`}
          </p>
        ) : (
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
        )
      ) : (
        <>
          <div className="min-w-0">
            <Table className="w-full table-fixed text-sm">
              <caption className="sr-only">
                {formattedTitle}: {itemCountLabel}, halaman {safePage} dari {totalPages}
                {isTruncated ? ' — hanya baris terbaru yang dimuat; gunakan filter untuk menjelajah riwayat yang lebih lama' : ''}
              </caption>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="border-b border-hairline hover:bg-transparent">
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className={
                          header.column.id === 'select'
                            ? 'w-8'
                            : header.column.id === 'actions'
                              ? 'w-12 text-right font-mono text-[11px] font-medium uppercase tracking-wider text-paper-faint'
                              : header.column.id === 'status'
                                ? 'hidden font-mono text-[11px] font-medium uppercase tracking-wider text-paper-faint sm:table-cell sm:w-28'
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
                  const itemId = row.id;
                  return (
                    <TableRow key={itemId} className="border-b border-hairline/60 transition-colors duration-180 hover:bg-bg-raised-2">
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className={
                            cell.column.id === 'select'
                              ? 'w-8 py-3'
                              : cell.column.id === 'actions'
                                ? 'w-12 py-3 text-right'
                                : cell.column.id === 'status'
                                  ? 'hidden py-3 sm:table-cell sm:w-28'
                                  : 'min-w-0 py-3'
                          }
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {editingItem !== null && editorConfig !== undefined ? (
            <div
              key={`editor-${editingId}`}
              className="mt-3 overflow-hidden rounded-lg border border-hairline bg-bg"
              data-visible-columns={visibleColumnCount}
            >
              <RecordEditorForm
                config={editorConfig}
                collectionKey={collectionKey}
                item={editingItem}
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
            </div>
          ) : null}
        </>
      )}

      {totalItems > 0 ? (
        <DashboardPager
          startIndex={startIndex}
          visibleCount={Math.min(PAGE_SIZE, totalItems - startIndex)}
          total={totalItems}
          page={safePage}
          pageCount={totalPages}
          onPageChange={handlePageChange}
          note={isTruncated ? 'termuat' : undefined}
        />
      ) : null}
    </section>
  );
}

/**
 * Column header button toggling the TanStack sort direction.
 *
 * @param label - Displayed column name.
 * @param column - Sortable TanStack column.
 * @returns Sort button with active direction icon.
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
