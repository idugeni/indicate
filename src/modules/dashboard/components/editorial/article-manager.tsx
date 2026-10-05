'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Archive,
  ArchiveRestore,
  Calendar,
  Clock,
  Globe,
  Loader2,
  Newspaper,
  Pencil,
  RotateCcw,
  Search,
  SearchX,
  Trash2,
  X,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { DashboardCommand } from '@/modules/dashboard/command';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Separator } from '@/components/ui/separator';
import { AppTooltip } from '@/ui/app-tooltip';
import { SectionCard } from '@/modules/dashboard/components/shared/section-card';
import { DashboardPager } from '@/modules/dashboard/components/shared/dashboard-pager';
import { useDashboardPage } from '@/modules/dashboard/components/shared/use-dashboard-query';
import { SearchCombobox } from '@/modules/dashboard/components/shared/search-combobox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { STATUS_BADGE_TONE, resolveStatus } from '@/modules/dashboard/components/data-view-format';
import { getEditorConfig, type LookupTables } from '@/modules/dashboard/components/shared/record-editor-config';
import { RecordEditorForm } from '@/modules/dashboard/components/shared/record-editor-form';
import { LiveblogUpdates } from '@/modules/dashboard/components/editorial/liveblog-updates';
import { articleTypeLabel, normalizeArticleType } from '@/modules/site/article-type';
import { ForOrgInbox } from '@/modules/dashboard/components/editorial/inbox-panel';

interface ArchiveArticle {
  readonly id: string;
  readonly title: string;
  readonly slug: string;
  readonly status: string;
  readonly publishedAt: string | null;
  readonly tags: readonly string[];
  readonly categoryIds: readonly string[];
  readonly regionId: string | null;
  readonly version: number;
  readonly body: string;
  readonly excerpt?: string | null;
  readonly canonicalUrl?: string | null;
  readonly publisherId?: string | null;
  readonly authorId?: string | null;
  readonly categoryId?: string | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
  readonly scheduledAt?: string | null;
  readonly type?: string | undefined;
  readonly isSponsored?: boolean | undefined;
}

/**
 * Lencana mode artikel di baris arsip; standar tidak menampilkan apa pun.
 *
 * @param type - Mode mentah baris; tak dikenal menjadi standar.
 * @returns Lencana kuningan, atau null untuk standar.
 */
function ModeBadge({ type }: { readonly type: string | undefined }) {
  const mode = normalizeArticleType(type);
  if (mode === 'standard') return null;
  return (
    <Badge variant="outline" className="border-brass/50 font-mono text-[10px] uppercase tracking-wider text-brass">
      {articleTypeLabel(mode)}
    </Badge>
  );
}

interface ArchiveCategory {
  readonly id: string;
  readonly name: string;
}

interface ArchiveSite {
  readonly id: string;
  readonly normalizedHostname: string;
  readonly siteLevel?: string;
  readonly domainId?: string;
}

function isApexSite(site: ArchiveSite): boolean {
  return site.siteLevel === undefined || site.siteLevel === 'apex';
}

interface ArchiveAssignment {
  readonly articleId: string;
  readonly siteId: string;
  readonly active?: boolean;
}

const PAGE_SIZE = 20;

const STATUS_LABELS: Readonly<Record<string, string>> = {
  draft: 'Draf',
  in_review: 'Tinjau',
  scheduled: 'Jadwal',
  active: 'Aktif',
  archived: 'Arsip',
};

const SORT_OPTIONS: ReadonlyArray<{ readonly value: string; readonly label: string }> = [
  { value: 'published-desc', label: 'Terbaru (tayang)' },
  { value: 'updated', label: 'Terakhir diubah' },
  { value: 'published-asc', label: 'Terlama (tayang)' },
  { value: 'syndicated', label: 'Portal terbanyak' },
  { value: 'title', label: 'Judul A-Z' },
];

const DEFAULT_SORT = 'published-desc';

function formatLong(value: string | null | undefined): string {
  if (value === null || value === undefined) return '—';
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return '—';
  return new Date(time).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function PortalList({ hostnames }: { readonly hostnames: readonly string[] }) {
  if (hostnames.length === 0) {
    return (
      <span className="font-sans text-[11px] text-paper-faint">Tanpa portal</span>
    );
  }

  return (
    <HoverCard>
      <HoverCardTrigger
        render={
          <Badge
            variant="outline"
            aria-label={`${hostnames.length} portal memuat artikel`}
            className="inline-flex cursor-pointer items-center gap-1 font-mono text-[11px] tabular-nums text-paper-dim hover:border-paper hover:text-paper"
          >
            <Globe className="size-3 text-paper-faint" />
            {hostnames.length} portal
          </Badge>
        }
      />
      <HoverCardContent align="start" className="w-64">
        <p className="m-0 font-mono text-[11px] uppercase tracking-wider text-paper-faint">
          Portal Apex ({hostnames.length})
        </p>
        <ul className="m-0 mt-1.5 max-h-36 list-none space-y-1 overflow-y-auto p-0">
          {hostnames.map((hostname) => (
            <li key={hostname} className="truncate font-mono text-[11px] text-paper-dim">
              {hostname}
            </li>
          ))}
        </ul>
      </HoverCardContent>
    </HoverCard>
  );
}

type ArticleLayout = 'mobile' | 'tablet' | 'desktop';

/**
 * Tingkat tampilan daftar artikel mengikuti viewport.
 *
 * @returns `mobile` sebelum mount atau tanpa `matchMedia` (termasuk SSR dan
 * jsdom), lalu `tablet` untuk 768–1023px dan `desktop` mulai 1024px.
 * @remarks Default `mobile` disengaja: render pertama selalu sama antara server
 * dan klien sehingga tidak ada hydration mismatch; peningkatan ke tablet atau
 * desktop terjadi di efek setelah mount. Satu branch ter-mount dalam satu
 * waktu agar DOM, nama aksesibel, dan test tidak terduplikasi.
 */
function useArticleLayout(): ArticleLayout {
  const [layout, setLayout] = useState<ArticleLayout>('mobile');
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const tabletQuery = window.matchMedia('(min-width: 768px)');
    const desktopQuery = window.matchMedia('(min-width: 1024px)');
    const update = (): void => {
      setLayout(desktopQuery.matches ? 'desktop' : tabletQuery.matches ? 'tablet' : 'mobile');
    };
    update();
    tabletQuery.addEventListener('change', update);
    desktopQuery.addEventListener('change', update);
    return () => {
      tabletQuery.removeEventListener('change', update);
      desktopQuery.removeEventListener('change', update);
    };
  }, []);
  return layout;
}

export function ArticleManager({
  data,
  command,
  onFilterApply,
  articlesNextCursor,
  articlesTotal,
  onLoadMoreArticles,
}: {
  readonly data: unknown;
  readonly command?: DashboardCommand | undefined;
  readonly onFilterApply?: ((query: string) => void) | undefined;
  readonly articlesNextCursor?: string | null | undefined;
  readonly articlesTotal?: number | undefined;
  readonly onLoadMoreArticles?: (() => Promise<{ readonly loaded: number; readonly total: number; readonly nextCursor: string | null } | null>) | undefined;
}) {
  const [page, setPage] = useDashboardPage('archivePage');
  const model = data as {
    readonly articles?: readonly ArchiveArticle[];
    readonly articlesNextCursor?: string | null;
    readonly total?: number;
    readonly tagOptions?: readonly { readonly tag: string; readonly count: number }[];
    readonly categories?: readonly ArchiveCategory[];
    readonly sites?: readonly ArchiveSite[];
    readonly articleSites?: readonly ArchiveAssignment[];
    readonly regions?: readonly Record<string, unknown>[];
    readonly publishers?: readonly Record<string, unknown>[];
    readonly authors?: readonly Record<string, unknown>[];
  } | null;

  const articles = useMemo(() => [...(model?.articles ?? [])], [model]);
  const categories = useMemo(() => model?.categories ?? [], [model]);
  const sites = useMemo(
    () =>
      [...(model?.sites ?? [])].sort((left, right) =>
        left.normalizedHostname.localeCompare(right.normalizedHostname),
      ),
    [model],
  );
  const assignments = useMemo(() => model?.articleSites ?? [], [model]);

  const searchId = useId();
  const categoryId = useId();
  const tagId = useId();
  const siteId = useId();
  const statusId = useId();
  const sortId = useId();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [tag, setTag] = useState('');
  const [site, setSite] = useState('');
  const [status, setStatus] = useState('active');
  const [sort, setSort] = useState<string>(DEFAULT_SORT);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<ArchiveArticle | null>(null);
  const editorConfig = getEditorConfig('articles');
  const layout = useArticleLayout();

  /**
   * Push the manager filters to the server (debounced): the list, totals,
   * and tag options below are all computed from the same predicates, so the
   * client never pages over a partial window it filtered itself.
   */
  useEffect(() => {
    if (onFilterApply === undefined) return;
    const needle = search.trim();
    const parts = [
      `status=${encodeURIComponent(status === '' ? 'active' : status)}`,
      `sort=${encodeURIComponent(sort)}`,
      ...(needle === '' ? [] : [`search=${encodeURIComponent(needle)}`]),
      ...(category === '' ? [] : [`categoryId=${encodeURIComponent(category)}`]),
      ...(tag === '' ? [] : [`tag=${encodeURIComponent(tag)}`]),
      ...(site === '' ? [] : [`siteHostname=${encodeURIComponent(site)}`]),
    ];
    const timer = window.setTimeout(() => onFilterApply(`&${parts.join('&')}`), 350);
    return () => window.clearTimeout(timer);
  }, [search, category, tag, site, status, sort, onFilterApply]);

  const categoryNames = useMemo(
    () => new Map(categories.map((item) => [item.id, item.name] as const)),
    [categories],
  );
  const apexHostnames = useMemo(
    () => new Map(sites.filter(isApexSite).map((item) => [item.id, item.normalizedHostname] as const)),
    [sites],
  );
  const apexByDomain = useMemo(() => {
    const grouped = new Map<string, string>();
    for (const item of sites) {
      if (!isApexSite(item) || item.domainId === undefined || grouped.has(item.domainId)) continue;
      grouped.set(item.domainId, item.normalizedHostname);
    }
    return grouped;
  }, [sites]);
  const domainBySite = useMemo(() => {
    const grouped = new Map<string, string>();
    for (const item of sites) {
      if (item.domainId === undefined) continue;
      grouped.set(item.id, item.domainId);
    }
    return grouped;
  }, [sites]);
  const sitesByArticle = useMemo(() => {
    const grouped = new Map<string, string[]>();
    for (const row of assignments) {
      if (row.active === false) continue;
      const domainId = domainBySite.get(row.siteId);
      const hostname = apexHostnames.get(row.siteId) ?? (domainId === undefined ? undefined : apexByDomain.get(domainId));
      if (hostname === undefined) continue;
      const list = grouped.get(row.articleId) ?? [];
      if (!list.includes(hostname)) list.push(hostname);
      grouped.set(row.articleId, list.sort());
    }
    return grouped;
  }, [assignments, apexHostnames, apexByDomain, domainBySite]);
  const allTags = useMemo(
    () => model?.tagOptions?.map((option) => option.tag).sort() ?? [...new Set(articles.flatMap((article) => article.tags))].sort(),
    [model, articles],
  );
  const portalOptions = useMemo(
    () =>
      [...new Set([...sitesByArticle.values()].flat())]
        .sort()
        .map((hostname) => ({ value: hostname, label: hostname })),
    [sitesByArticle],
  );

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return articles.filter((article) => {
      if (needle !== '' && !`${article.title}${article.slug}`.toLowerCase().includes(needle)) return false;
      if (category !== '') {
        const ids =
          article.categoryId === undefined || article.categoryId === null
            ? article.categoryIds
            : [...article.categoryIds, article.categoryId];
        if (!ids.includes(category)) return false;
      }
      if (tag !== '' && !article.tags.includes(tag)) return false;
      if (status !== '' && article.status !== status) return false;
      if (site !== '') {
        const hostnames = sitesByArticle.get(article.id) ?? [];
        if (!hostnames.includes(site)) return false;
      }
      return true;
    });
  }, [articles, search, category, tag, status, site, sitesByArticle]);

  const serverTotal = model?.total ?? articlesTotal;
  const totalCount = serverTotal ?? filtered.length;
  const nextCursor = model?.articlesNextCursor ?? articlesNextCursor ?? null;
  const fillingRef = useRef(false);

  const goToPage = (next: number) => {
    setPage(next);
    if (onLoadMoreArticles === undefined || fillingRef.current) return;
    void (async () => {
      fillingRef.current = true;
      try {
        let guard = 0;
        let state = { loaded: articles.length, cursor: nextCursor };
        while (next * PAGE_SIZE > state.loaded && state.cursor !== null && guard++ < 10) {
          const result = await onLoadMoreArticles();
          if (result === null) break;
          state = { loaded: result.loaded, cursor: result.nextCursor };
        }
      } finally {
        fillingRef.current = false;
      }
    })();
  };

  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const lookups: LookupTables = {
    regions: model?.regions ?? [],
    publishers: model?.publishers ?? [],
    categories: categories.map((item) => ({ id: item.id, name: item.name })),
    authors: model?.authors ?? [],
  };


  const resetPage = () => setPage(1);

  const hasActiveFilters =
    search.trim() !== '' || category !== '' || tag !== '' || site !== '' || status !== 'active';

  const resetAllFilters = () => {
    setSearch('');
    setCategory('');
    setTag('');
    setSite('');
    setStatus('active');
    setSort(DEFAULT_SORT);
    resetPage();
  };

  const runRowAction = async (article: ArchiveArticle): Promise<void> => {
    if (command === undefined || busyId !== null) return;
    const action = article.status === 'archived' ? 'article.restore' : 'article.archive';
    const restoring = article.status === 'archived';
    setBusyId(article.id);
    try {
      await command(action, { id: article.id, expectedVersion: article.version }, { refresh: true });
      toast.success(restoring ? 'Artikel dipulihkan.' : 'Artikel diarsipkan.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Perubahan status artikel gagal.');
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async (): Promise<void> => {
    if (command === undefined || deleting === null || busyId !== null) return;
    const target = deleting;
    setBusyId(target.id);
    try {
      const result = await command('article.delete', { id: target.id, expectedVersion: target.version }, { refresh: true });
      if (result !== null) {
        setDeleting(null);
        toast.success('Artikel dihapus beserta salinannya di seluruh portal.');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Artikel gagal dihapus.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <SectionCard icon={Newspaper} title={`Kelola artikel (${totalCount})`} eyebrow="Lintas portal">
      <div className="space-y-4">
        <ForOrgInbox command={command} />
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor={searchId} className="text-xs font-medium text-paper-dim">
                Pencarian
              </Label>
              {hasActiveFilters && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={resetAllFilters}
                  className="h-6 gap-1 px-2 text-xs text-paper-faint hover:text-paper lg:hidden"
                >
                  <RotateCcw className="size-3" />
                  Reset
                </Button>
              )}
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-paper-faint" />
              <Input
                id={searchId}
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  resetPage();
                }}
                placeholder="Cari judul atau slug..."
                className="h-9 pl-9 pr-8 text-sm"
              />
              {search.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-paper-faint hover:text-paper"
                  onClick={() => {
                    setSearch('');
                    resetPage();
                  }}
                  aria-label="Bersihkan pencarian"
                >
                  <X className="size-3.5" />
                </Button>
              )}
            </div>
          </div>

          {hasActiveFilters && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={resetAllFilters}
              className="hidden h-9 gap-1.5 text-xs text-paper-dim lg:inline-flex"
            >
              <RotateCcw className="size-3" />
              Reset filter
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1">
            <Label htmlFor={categoryId} className="text-xs font-medium text-paper-dim">
              Kategori
            </Label>
            <SearchCombobox
              id={categoryId}
              value={category}
              onValueChange={(next) => {
                setCategory(next ?? '');
                resetPage();
              }}
              placeholder="Semua kategori"
              options={categories.map((item) => ({ value: item.id, label: item.name }))}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor={tagId} className="text-xs font-medium text-paper-dim">
              Tag
            </Label>
            <SearchCombobox
              id={tagId}
              value={tag}
              onValueChange={(next) => {
                setTag(next ?? '');
                resetPage();
              }}
              placeholder="Semua tag"
              options={allTags.map((item) => ({ value: item, label: item }))}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor={siteId} className="text-xs font-medium text-paper-dim">
              Portal
            </Label>
            <SearchCombobox
              id={siteId}
              value={site}
              onValueChange={(next) => {
                setSite(next ?? '');
                resetPage();
              }}
              placeholder={portalOptions.length === 0 ? 'Tidak ada portal' : 'Semua portal'}
              options={portalOptions}
            />
            <p className="m-0 font-mono text-[11px] text-paper-faint">
              {portalOptions.length === 0
                ? 'Belum ada portal yang memuat artikel.'
                : `${portalOptions.length.toLocaleString('id-ID')} portal yang memuat artikel.`}
            </p>
          </div>

          <div className="space-y-1">
            <Label htmlFor={statusId} className="text-xs font-medium text-paper-dim">
              Status
            </Label>
            <SearchCombobox
              id={statusId}
              value={status}
              onValueChange={(next) => {
                setStatus(next ?? '');
                resetPage();
              }}
              placeholder="Semua status"
              options={Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor={sortId} className="text-xs font-medium text-paper-dim">
              Urutan
            </Label>
            <SearchCombobox
              id={sortId}
              value={sort}
              onValueChange={(next) => {
                setSort(next ?? DEFAULT_SORT);
                resetPage();
              }}
              placeholder="Pilih urutan"
              options={SORT_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
            />
          </div>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="mt-6 flex flex-col items-center justify-center rounded-lg border border-dashed border-hairline py-12 text-center">
          <SearchX className="size-6 text-paper-faint" />
          <p className="mt-2 text-sm text-paper">Tidak ada artikel yang cocok</p>
          <p className="mt-1 text-xs text-paper-faint">Coba sesuaikan kata kunci atau bersihkan parameter penyaringan.</p>
        </div>
      ) : (
        <div className="pt-4">
          <div className="hidden border-b border-hairline pb-2 lg:grid lg:grid-cols-[44px_minmax(0,1fr)_140px_180px_160px_80px_96px] lg:items-center lg:gap-3 lg:px-3">
            <span className="font-mono text-[11px] uppercase tracking-wider text-paper-faint">No</span>
            <span className="font-mono text-[11px] uppercase tracking-wider text-paper-faint">Judul & Slug</span>
            <span className="font-mono text-[11px] uppercase tracking-wider text-paper-faint">Portal Apex</span>
            <span className="font-mono text-[11px] uppercase tracking-wider text-paper-faint">Kategori & Tag</span>
            <span className="font-mono text-[11px] uppercase tracking-wider text-paper-faint">Waktu</span>
            <span className="font-mono text-[11px] uppercase tracking-wider text-paper-faint">Status</span>
            <span className="text-right font-mono text-[11px] uppercase tracking-wider text-paper-faint">Aksi</span>
          </div>

          <ul aria-label="Kelola artikel lintas portal" className="m-0 list-none space-y-2.5 p-0 pt-2 lg:space-y-0">
            {visible.map((article, index) => {
              const portalNames = sitesByArticle.get(article.id) ?? [];
              const effectiveCategoryIds =
                article.categoryId === undefined || article.categoryId === null
                  ? article.categoryIds
                  : [...new Set([...article.categoryIds, article.categoryId])];
              const categoryLabels = effectiveCategoryIds
                .map((id) => categoryNames.get(id))
                .filter((name): name is string => name !== undefined);
              const rowNumber = (safePage - 1) * PAGE_SIZE + index + 1;
              const isArchived = article.status === 'archived';
              const rowActionLabel = isArchived ? 'Pulihkan' : 'Arsipkan';
              const RowActionIcon = isArchived ? ArchiveRestore : Archive;
              const actionsDisabled = command === undefined || busyId !== null;
              const rowBusy = busyId === article.id;
              const statusTone = STATUS_BADGE_TONE[resolveStatus(article.status).tone];
              const visibleTags = article.tags.slice(0, 2);
              const hiddenTagCount = article.tags.length - visibleTags.length;
              const isEditingThisRow = editingId === article.id && editorConfig !== undefined;

              return (
                <li
                  key={article.id}
                  className="rounded-lg border border-hairline bg-bg transition-colors lg:rounded-none lg:border-0 lg:border-b lg:border-hairline lg:bg-transparent lg:hover:bg-paper/5"
                >
                  {layout === 'mobile' ? (
                  <div className="flex flex-col space-y-3 p-3.5 sm:space-y-3 md:hidden">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs tabular-nums text-paper-faint">#{rowNumber}</span>
                        <Badge
                          variant="outline"
                          className={`font-mono text-[10px] uppercase tracking-wider ${statusTone}`}
                        >
                          {STATUS_LABELS[article.status] ?? article.status}
                        </Badge>
                        <ModeBadge type={article.type} />
                      </div>
                      <PortalList hostnames={portalNames} />
                    </div>

                    <div>
                      <p className="m-0 break-words text-sm font-medium leading-snug text-paper">{article.title}</p>
                      <p className="m-0 mt-0.5 truncate font-mono text-[11px] text-paper-faint">/{article.slug}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-1">
                      {categoryLabels.map((name) => (
                        <Badge key={name} variant="outline" className="font-sans text-[10px] text-paper-dim">
                          {name}
                        </Badge>
                      ))}
                      {categoryLabels.length === 0 ? (
                        <Badge variant="outline" className="border-dashed font-sans text-[10px] font-normal text-paper-faint">
                          Tanpa kategori
                        </Badge>
                      ) : null}
                      {visibleTags.map((t) => (
                        <span key={t} className="font-mono text-[10px] text-paper-faint">
                          #{t}
                        </span>
                      ))}
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-paper-faint">
                        Ubah {formatLong(article.updatedAt)}
                      </span>

                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          disabled={actionsDisabled}
                          onClick={() => setEditingId((prev) => (prev === article.id ? null : article.id))}
                          aria-label={`Ubah artikel ${article.title}`}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          disabled={actionsDisabled}
                          onClick={() => {
                            void runRowAction(article);
                          }}
                          aria-label={`${rowActionLabel} artikel ${article.title}`}
                        >
                          {rowBusy ? <Loader2 className="size-3.5 animate-spin" /> : <RowActionIcon className="size-3.5" />}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          disabled={actionsDisabled}
                          className="text-paper-dim hover:text-destructive"
                          onClick={() => setDeleting(article)}
                          aria-label={`Hapus permanen artikel ${article.title}`}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  ) : null}

                  {layout === 'tablet' ? (
                  <div className="hidden md:flex md:items-start md:justify-between md:gap-4 md:p-3.5 lg:hidden">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <span className="w-6 flex-none pt-0.5 font-mono text-xs tabular-nums text-paper-faint">
                        {rowNumber}
                      </span>
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div>
                          <p className="m-0 break-words text-sm font-medium leading-snug text-paper">{article.title}</p>
                          <p className="m-0 mt-0.5 truncate font-mono text-[11px] text-paper-faint">/{article.slug}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <PortalList hostnames={portalNames} />
                          {categoryLabels.map((name) => (
                            <Badge key={name} variant="outline" className="font-sans text-[10px] text-paper-dim">
                              {name}
                            </Badge>
                          ))}
                          {visibleTags.map((t) => (
                            <span key={t} className="font-mono text-[10px] text-paper-faint">
                              #{t}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-none flex-col items-end space-y-2 border-l border-hairline pl-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-paper-faint">
                          {formatLong(article.updatedAt)}
                        </span>
                        <Badge
                          variant="outline"
                          className={`font-mono text-[10px] uppercase tracking-wider ${statusTone}`}
                        >
                          {STATUS_LABELS[article.status] ?? article.status}
                        </Badge>
                        <ModeBadge type={article.type} />
                      </div>

                      <div className="flex items-center gap-1">
                        <AppTooltip label={`Ubah ${article.title}`}>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            disabled={actionsDisabled}
                            onClick={() => setEditingId((prev) => (prev === article.id ? null : article.id))}
                            aria-label={`Ubah artikel ${article.title}`}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                        </AppTooltip>
                        <AppTooltip label={`${rowActionLabel}${article.title}`}>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            disabled={actionsDisabled}
                            onClick={() => {
                              void runRowAction(article);
                            }}
                            aria-label={`${rowActionLabel} artikel ${article.title}`}
                          >
                            {rowBusy ? <Loader2 className="size-3.5 animate-spin" /> : <RowActionIcon className="size-3.5" />}
                          </Button>
                        </AppTooltip>
                        <AppTooltip label={`Hapus ${article.title}`}>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            disabled={actionsDisabled}
                            className="text-paper-dim hover:text-destructive"
                            onClick={() => setDeleting(article)}
                            aria-label={`Hapus permanen artikel ${article.title}`}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </AppTooltip>
                      </div>
                    </div>
                  </div>
                  ) : null}

                  {layout === 'desktop' ? (
                  <div className="hidden lg:grid lg:grid-cols-[44px_minmax(0,1fr)_140px_180px_160px_80px_96px] lg:items-center lg:gap-3 lg:px-3 lg:py-2.5">
                    <span className="font-mono text-xs tabular-nums text-paper-faint">{rowNumber}</span>

                    <div className="min-w-0 pr-2">
                      <p className="m-0 truncate text-sm font-medium text-paper">{article.title}</p>
                      <p className="m-0 truncate font-mono text-[11px] text-paper-faint">/{article.slug}</p>
                    </div>

                    <div className="min-w-0">
                      <PortalList hostnames={portalNames} />
                    </div>

                    <div className="flex min-w-0 flex-wrap items-center gap-1">
                      {categoryLabels.slice(0, 1).map((name) => (
                        <Badge key={name} variant="outline" className="truncate font-sans text-[10px] text-paper-dim">
                          {name}
                        </Badge>
                      ))}
                      {visibleTags.slice(0, 1).map((t) => (
                        <span key={t} className="truncate font-mono text-[10px] text-paper-faint">
                          #{t}
                        </span>
                      ))}
                      {hiddenTagCount > 0 && (
                        <span className="font-mono text-[10px] text-paper-faint">+{hiddenTagCount}</span>
                      )}
                    </div>

                    <div className="flex flex-col font-mono text-[11px] leading-tight text-paper-faint">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="size-3" /> {formatLong(article.publishedAt)}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px]">
                        <Clock className="size-3" /> {formatLong(article.updatedAt)}
                      </span>
                    </div>

                    <div>
                      <Badge
                        variant="outline"
                        className={`font-mono text-[10px] uppercase tracking-wider ${statusTone}`}
                      >
                        {STATUS_LABELS[article.status] ?? article.status}
                      </Badge>
                      <ModeBadge type={article.type} />
                    </div>

                    <div className="flex items-center justify-end gap-0.5">
                      <AppTooltip label={`Ubah artikel ${article.title}`}>
                        <Button
                          type="button"
                          variant={editingId === article.id ? 'secondary' : 'ghost'}
                          size="icon-sm"
                          disabled={actionsDisabled}
                          onClick={() => setEditingId((prev) => (prev === article.id ? null : article.id))}
                          aria-label={`Ubah artikel ${article.title}`}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                      </AppTooltip>

                      <AppTooltip label={`${rowActionLabel} artikel ${article.title}`}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          disabled={actionsDisabled}
                          onClick={() => {
                            void runRowAction(article);
                          }}
                          aria-label={`${rowActionLabel} artikel ${article.title}`}
                        >
                          {rowBusy ? <Loader2 className="size-3.5 animate-spin" /> : <RowActionIcon className="size-3.5" />}
                        </Button>
                      </AppTooltip>

                      <AppTooltip label={`Hapus permanen artikel ${article.title}`}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          disabled={actionsDisabled}
                          className="text-paper-dim hover:text-destructive"
                          onClick={() => setDeleting(article)}
                          aria-label={`Hapus permanen artikel ${article.title}`}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </AppTooltip>
                    </div>
                  </div>
                  ) : null}

                  {isEditingThisRow && (
                    <div className="border-t border-hairline bg-paper/5 p-3 sm:p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="font-mono text-xs uppercase tracking-wider text-paper">
                          Edit: {article.title}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setEditingId(null)}
                          aria-label="Tutup form edit"
                        >
                          <X className="size-3.5" />
                        </Button>
                      </div>
                      <RecordEditorForm
                        config={editorConfig}
                        collectionKey="articles"
                        item={{ ...article }}
                        lookups={lookups}
                        onSaved={() => {
                          setEditingId(null);
                        }}
                        onCancel={() => setEditingId(null)}
                        onSubmit={async (act, payload) => (command === undefined ? null : command(act, payload))}
                      />
                      {normalizeArticleType(article.type) === 'liveblog' && command !== undefined ? (
                        <LiveblogUpdates articleId={article.id} articleTitle={article.title} command={command} />
                      ) : null}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus permanen artikel?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting === null
                ? ''
                : `"${deleting.title}" dan seluruh revisinya akan dihapus permanen dan tidak bisa dikembalikan. Hanya draf dan arsip yang bisa dihapus; artikel tayang harus diarsipkan terlebih dahulu.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              disabled={busyId !== null}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                void confirmDelete();
              }}
            >
              {busyId !== null ? 'Menghapus…' : 'Hapus permanen'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DashboardPager
        startIndex={(safePage - 1) * PAGE_SIZE}
        visibleCount={visible.length}
        total={totalCount}
        page={safePage}
        pageCount={pageCount}
        onPageChange={goToPage}
      />
      {onLoadMoreArticles !== undefined && nextCursor !== null ? (
        <div className="mt-3 flex justify-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              if (fillingRef.current) return;
              fillingRef.current = true;
              void onLoadMoreArticles().finally(() => {
                fillingRef.current = false;
              });
            }}
          >
            Muat artikel lebih lama
          </Button>
        </div>
      ) : null}
    </SectionCard>
  );
}