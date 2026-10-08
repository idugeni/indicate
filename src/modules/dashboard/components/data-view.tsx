'use client';

import { useMemo, useState } from 'react';
import { Archive, ArrowDown, ArrowUp, ArrowUpDown, Check, CircleCheck, Copy, FileText, Globe, Images, Inbox, LayoutGrid, ListChecks, MoreVertical, Network, Pencil, RefreshCw, RotateCcw, SearchX, Send, SlidersHorizontal } from 'lucide-react';
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
import type { DashboardCommand } from '@/modules/dashboard/command';
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
import { beginActionProgress } from '@/modules/dashboard/components/shared/action-progress';
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
  DashboardViewSkeleton,
} from '@/modules/dashboard/components/dashboard-skeletons';
import type { View } from '@/modules/dashboard/components/dashboard-types';
import type { AnalyticsProjection } from '@/modules/dashboard/models';
import { TelemetryGallery } from '@/modules/dashboard/components/analytics/gallery';
import { DashboardV2CommandCenter } from '@/modules/dashboard/components/dashboard-v2-command-center';
import { DashboardV2ModuleSurface } from '@/modules/dashboard/components/dashboard-v2-module-surface';
import { getEditorConfig, type EditorTransition, type LookupTables } from '@/modules/dashboard/components/shared/record-editor-config';
import { RecordEditorForm } from '@/modules/dashboard/components/shared/record-editor-form';

interface DataViewProps {
  readonly view: View;
  readonly displayName?: string;
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
  readonly command?: DashboardCommand;
  /** Switch modules from inside content (quick actions, guides); when absent, navigation buttons are hidden. */
  readonly onSelectView?: (view: View) => void;
  /** Tenant scope for additive AI assists; absent disables them. */
  readonly organizationId?: string | undefined;
  /** Keyset cursor for the audit trail; when present with `onLoadMoreAudit`, the audit table grows page by page. */
  readonly auditNextCursor?: string | null | undefined;
  readonly onLoadMoreAudit?: (() => void) | undefined;
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
  displayName = 'INDICATE',
  data,
  currentPage,
  onPageChange,
  onRefresh,
  collections: onlyCollections,
  command,
  onSelectView,
  auditNextCursor,
  onLoadMoreAudit,
}: DataViewProps) {
  if (data === null || data === undefined) {
    return <DashboardViewSkeleton view={view} />;
  }

  if (view === 'dashboard') {
    const dashboard = typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : {};
    const jobs = dashboard.jobsByState as Record<string, number> | undefined;
    const asNumber = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? value : 0);
    const analytics = isAnalyticsProjection(dashboard.analytics) ? dashboard.analytics : null;

    return (
      <DashboardV2CommandCenter
        displayName={displayName}
        dashboard={{
          activeDomains: asNumber(dashboard.activeDomains),
          activeSubdomains: asNumber(dashboard.activeSubdomains),
          activeSites: asNumber(dashboard.activeSites),
          activeArticles: asNumber(dashboard.activeArticles),
          archivedArticles: asNumber(dashboard.archivedArticles),
          jobsByState: {
            queued: asNumber(jobs?.queued),
            processing: asNumber(jobs?.processing),
            published: asNumber(jobs?.published),
            failed: asNumber(jobs?.failed),
            retrying: asNumber(jobs?.retrying),
            unpublished: asNumber(jobs?.unpublished),
          },
          successfulSiteOutcomes: asNumber(dashboard.successfulSiteOutcomes),
          failedSiteOutcomes: asNumber(dashboard.failedSiteOutcomes),
        }}
        analytics={analytics}
        onSelectView={onSelectView ?? (() => undefined)}
      />
    );
  }

  return <DashboardV2ModuleSurface view={view} data={data} onRefresh={onRefresh} />;

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
      nextCursor={collectionKey === 'auditLogs' ? (auditNextCursor ?? null) : null}
      onLoadMore={collectionKey === 'auditLogs' ? onLoadMoreAudit : undefined}
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

  if (collections.length > 1 && (view === 'configuration' || view === 'settings')) {
    return (
      <div
        className={`grid items-start gap-6 ${collections.length >= 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'}`}
      >
        {collections.map(([collectionKey, items]) => renderTable(collectionKey, items))}
      </div>
    );
  }

  return <div className="space-y-6">{collections.map(([collectionKey, items]) => renderTable(collectionKey, items))}</div>;
}

type CollectionItem = Record<string, unknown>;

const COLLECTION_ICONS: Readonly<Record<string, typeof Globe>> = {
  domains: Globe,
  regions: Network,
  sites: LayoutGrid,
  articles: FileText,
  media: Images,
  auditLogs: ListChecks,
  retentionRuns: Archive,
  invalidationTasks: RefreshCw,
  objectCleanupTasks: Archive,
  webhookReplayClaims: Send,
};

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
  nextCursor = null,
  onLoadMore,
}: {
  readonly collectionKey: string;
  readonly rawItems: readonly CollectionItem[];
  readonly lookups: LookupTables;
  readonly currentPage: number;
  readonly onPageChange: (page: number) => void;
  readonly onRefresh: () => void;
  readonly command: DashboardCommand | undefined;
  /** Set false when a wrapping section already names the table. */
  readonly showTitle?: boolean;
  /**
   * Keyset cursor for server-paged collections; with `onLoadMore` the table
   * grows page by page instead of truncating at the first window.
   */
  readonly nextCursor?: string | null | undefined;
  readonly onLoadMore?: (() => void) | undefined;
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
  const CollectionIcon = COLLECTION_ICONS[collectionKey];
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
    const progress = beginActionProgress(`Menjalankan ${transition.label} untuk ${rows.length} baris…`);
    try {
      for (const row of rows) {
        const result = await command(transition.action, {
          id: row.original.id,
          expectedVersion: Number(row.original.version ?? 1),
        });
        if (result !== null) succeeded += 1;
        progress.step(`${transition.label}: ${succeeded} dari ${rows.length} baris selesai.`);
      }
      if (succeeded === 0) throw new Error(`Aksi ${transition.label} gagal untuk semua ${rows.length} baris.`);
      progress.succeed(`${transition.label}: ${succeeded} dari ${rows.length} baris berhasil.`);
    } catch (cause) {
      progress.fail(cause instanceof Error ? cause.message : `Aksi ${transition.label} gagal.`);
    }
    setEditingId(null);
    setRowSelection({});
    onRefresh();
  };

  return (
    <section key={collectionKey} aria-label={formattedTitle} className="min-w-0 rounded-lg border border-hairline bg-bg-raised p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-hairline pb-3">
        {showTitle ? (
          <h2 className="m-0 flex items-center gap-1.5 font-sans text-sm font-semibold tracking-tight text-paper">
            {CollectionIcon ? <CollectionIcon className="h-4 w-4 text-brass" aria-hidden="true" /> : null}
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
      {onLoadMore !== undefined && nextCursor !== null ? (
        <div className="mt-3 flex justify-center">
          <Button type="button" variant="outline" size="sm" onClick={onLoadMore}>
            Muat riwayat lebih lama
          </Button>
        </div>
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
