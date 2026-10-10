'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  ArchiveRestore,
  ChevronRight,
  FileText,
  Loader2,
  Search,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/modules/dashboard/components/empty-state';
import { STATUS_BADGE_TONE, resolveStatus } from '@/modules/dashboard/components/data-view-format';
import { DashboardPager } from '@/modules/dashboard/components/shared/dashboard-pager';
import { SearchCombobox } from '@/modules/dashboard/components/shared/search-combobox';
import { useDashboardPage } from '@/modules/dashboard/components/shared/use-dashboard-query';
import type { DashboardCommand } from '@/modules/dashboard/command';

type Row = {
  readonly id: string;
  readonly title: string;
  readonly slug: string;
  readonly status: string;
  readonly publishedAt?: string | null;
  readonly publishedAtMax?: string | null;
  readonly publishedUrls?: readonly string[];
  readonly version: number;
  readonly portalHostnames?: readonly string[];
  readonly tags?: readonly string[];
  readonly organizationId?: string;
  readonly orgName?: string;
};

interface SiteSummary {
  readonly id: string;
  readonly normalizedHostname: string;
}

interface AssignmentSummary {
  readonly articleId: string;
  readonly siteId: string;
  readonly state: string;
  readonly active?: boolean;
  readonly publishedAt?: string | null;
}

interface ContentLibraryModel {
  readonly articles?: readonly Row[];
  readonly sites?: readonly SiteSummary[];
  readonly articleSites?: readonly AssignmentSummary[];
  readonly total?: number;
  readonly articlesNextCursor?: string | null;
}

interface PublicationFacts {
  readonly isPublished: boolean;
  readonly publishedAt: string | null;
  readonly portalCount: number;
}

const statuses = [
  { value: '', label: 'Semua status' },
  { value: 'active', label: 'Aktif' },
  { value: 'draft', label: 'Draf' },
  { value: 'in_review', label: 'Tinjau' },
  { value: 'scheduled', label: 'Jadwal' },
  { value: 'archived', label: 'Arsip' },
];

function dateLabel(value: string | null): string {
  if (value === null) return 'Belum tayang';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
}

function hostnameFromUrl(value: string): string | null {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
      ? parsed.hostname.toLowerCase()
      : null;
  } catch {
    return null;
  }
}

function publicationFacts(
  article: Row,
  assignments: readonly AssignmentSummary[],
  siteHostnames: ReadonlyMap<string, string>,
): PublicationFacts {
  const articleAssignments = assignments.filter(
    (assignment) => assignment.articleId === article.id,
  );
  const publishedAssignments = articleAssignments.filter(
    (assignment) => assignment.state === 'published' && assignment.active !== false,
  );
  const assignedHosts = articleAssignments
    .filter((assignment) => assignment.active !== false)
    .map((assignment) => siteHostnames.get(assignment.siteId))
    .filter((hostname): hostname is string => hostname !== undefined && hostname !== '');
  const publishedUrlHosts = (article.publishedUrls ?? [])
    .map(hostnameFromUrl)
    .filter((hostname): hostname is string => hostname !== null);
  const suppliedHosts = (article.portalHostnames ?? []).filter(
    (hostname) => hostname.trim() !== '',
  );
  const portalHosts =
    suppliedHosts.length > 0 ? suppliedHosts : [...assignedHosts, ...publishedUrlHosts];
  const publicationTimestamps = [
    article.publishedAtMax,
    article.publishedAt,
    ...publishedAssignments.map((assignment) => assignment.publishedAt ?? null),
  ].filter(
    (timestamp): timestamp is string =>
      timestamp !== null && timestamp !== undefined && timestamp !== '',
  );
  publicationTimestamps.sort((left, right) => right.localeCompare(left));
  const publishedAt = publicationTimestamps[0] ?? null;
  const isPublished =
    (article.publishedUrls?.length ?? 0) > 0 ||
    article.publishedAtMax != null ||
    publishedAssignments.length > 0 ||
    article.publishedAt != null;

  return {
    isPublished,
    publishedAt,
    portalCount: new Set(portalHosts).size,
  };
}

export function ContentLibraryV2({
  data,
  command,
  onFilterApply,
  articlesNextCursor,
  articlesTotal,
  onLoadMoreArticles,
  crossOrg,
  onEditArticle,
}: {
  readonly data: unknown;
  readonly command?: DashboardCommand | undefined;
  readonly onFilterApply?: ((query: string) => void) | undefined;
  readonly articlesNextCursor?: string | null | undefined;
  readonly articlesTotal?: number | undefined;
  readonly onLoadMoreArticles?:
    | (() => Promise<{
        readonly loaded: number;
        readonly total: number;
        readonly nextCursor: string | null;
      } | null>)
    | undefined;
  readonly crossOrg?: boolean | undefined;
  readonly onEditArticle?: ((id: string) => void) | undefined;
}) {
  const model = (data ?? {}) as ContentLibraryModel;
  const rows = useMemo(() => [...(model.articles ?? [])], [model.articles]);
  const siteHostnames = useMemo(
    () => new Map((model.sites ?? []).map((site) => [site.id, site.normalizedHostname])),
    [model.sites],
  );
  const total = model.total ?? articlesTotal ?? rows.length;
  const cursor = model.articlesNextCursor ?? articlesNextCursor ?? null;
  const [page, setPage] = useDashboardPage('archivePage');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('published-desc');
  const [selected, setSelected] = useState<readonly string[]>([]);
  const [busy, setBusy] = useState<readonly string[]>([]);

  useEffect(() => {
    if (!onFilterApply) return;
    const timer = window.setTimeout(() => {
      const parts = [`sort=${encodeURIComponent(sort)}`];
      if (status !== '') parts.unshift(`status=${encodeURIComponent(status)}`);
      if (search.trim()) parts.push(`search=${encodeURIComponent(search.trim())}`);
      onFilterApply(`&${parts.join('&')}`);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search, status, sort, onFilterApply, setPage]);

  const count = Math.max(1, Math.ceil(rows.length / 20));
  const safe = Math.min(page, count);
  const visible = rows.slice((safe - 1) * 20, safe * 20);
  const ids = visible.map((row) => row.id);
  const selectedVisible = ids.filter((id) => selected.includes(id));
  const togglePage = () =>
    setSelected((current) =>
      selectedVisible.length === ids.length
        ? current.filter((id) => !ids.includes(id))
        : [...new Set([...current, ...ids])],
    );

  const run = async (
    row: Row,
    action: 'article.archive' | 'article.restore' | 'article.delete',
    refresh = true,
  ) => {
    if (!command || busy.includes(row.id)) return;
    setBusy((current) => [...current, row.id]);
    try {
      const owner =
        crossOrg && row.organizationId ? { ownerOrganizationId: row.organizationId } : {};
      await command(action, { id: row.id, expectedVersion: row.version, ...owner }, { refresh });
      toast.success(
        action === 'article.archive'
          ? 'Artikel diarsipkan.'
          : action === 'article.restore'
            ? 'Artikel dipulihkan.'
            : 'Artikel dihapus.',
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Aksi artikel gagal.');
    } finally {
      setBusy((current) => current.filter((id) => id !== row.id));
    }
  };

  const archiveSelected = async () => {
    const selectedRows = visible.filter((row) => selectedVisible.includes(row.id));
    for (const [index, row] of selectedRows.entries()) {
      await run(row, 'article.archive', index === selectedRows.length - 1);
    }
  };

  return (
    <section aria-label="Content Library" className="space-y-5">
      <header className="rounded-xl border border-hairline bg-bg-raised/60 p-5">
        <p className="m-0 font-mono text-[10px] uppercase tracking-[.18em] text-brass">
          04 / Content Library
        </p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="m-0 text-2xl font-semibold text-paper">Content Library</h1>
            <p className="m-0 mt-1 text-sm text-paper-faint">
              Inventory artikel jaringan dengan filter, coverage portal, status, dan handoff ke
              Editorial Workspace.
            </p>
          </div>
          <Badge variant="outline" className="font-mono text-[10px] uppercase">
            {total.toLocaleString('id-ID')} artikel
          </Badge>
        </div>
      </header>

      <div className="rounded-lg border border-hairline bg-bg-raised p-3">
        <div className="grid gap-2 lg:grid-cols-[1fr_180px_180px_auto]">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-paper-faint" />
            <Input
              aria-label="Cari artikel"
              className="pl-8"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari judul atau slug"
            />
          </div>
          <SearchCombobox
            aria-label="Status artikel"
            value={status}
            onValueChange={(value) => setStatus(value ?? '')}
            options={statuses}
            placeholder="Status"
          />
          <SearchCombobox
            aria-label="Urutan artikel"
            value={sort}
            onValueChange={(value) => setSort(value ?? 'published-desc')}
            options={[
              { value: 'published-desc', label: 'Terbaru tayang' },
              { value: 'updated', label: 'Terakhir diubah' },
              { value: 'title', label: 'Judul A–Z' },
              { value: 'syndicated', label: 'Portal terbanyak' },
            ]}
            placeholder="Urutan"
          />
          <Button
            variant="ghost"
            onClick={() => {
              setSearch('');
              setStatus('');
              setSort('published-desc');
              setSelected([]);
            }}
          >
            Reset
          </Button>
        </div>
      </div>

      {selectedVisible.length > 0 ? (
        <div
          role="status"
          className="flex gap-2 rounded-lg border border-brass/40 bg-bg-raised p-3"
        >
          <span className="mr-auto text-xs text-paper-dim">{selectedVisible.length} terpilih</span>
          <Button
            size="sm"
            variant="outline"
            disabled={selectedVisible.some((id) => busy.includes(id))}
            onClick={() => void archiveSelected()}
          >
            Arsipkan
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
            Batal
          </Button>
        </div>
      ) : null}

      {visible.length === 0 ? (
        <EmptyState
          title="Tidak ada artikel yang cocok."
          description="Ubah filter atau muat ulang data dari server."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-hairline bg-bg-raised">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-hairline text-left font-mono text-[10px] uppercase text-paper-faint">
                <th className="w-10 p-3">
                  <Checkbox
                    checked={selectedVisible.length === ids.length}
                    indeterminate={
                      selectedVisible.length > 0 && selectedVisible.length < ids.length
                    }
                    onCheckedChange={togglePage}
                    aria-label="Pilih artikel halaman"
                  />
                </th>
                <th className="p-3">Artikel</th>
                <th className="p-3">Status</th>
                <th className="p-3">Portal</th>
                <th className="p-3">Tayang</th>
                <th className="p-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => {
                const meta = resolveStatus(row.status);
                const publication = publicationFacts(row, model.articleSites ?? [], siteHostnames);
                const isBusy = busy.includes(row.id);
                const transition =
                  row.status === 'archived' ? 'article.restore' : 'article.archive';
                const statusTone = publication.isPublished
                  ? STATUS_BADGE_TONE.ok
                  : STATUS_BADGE_TONE[meta.tone];
                const statusLabel = publication.isPublished ? 'Tayang' : meta.label;
                const publicationLabel = publication.publishedAt
                  ? dateLabel(publication.publishedAt)
                  : publication.isPublished
                    ? 'Tayang · waktu belum tercatat'
                    : 'Belum tayang';

                return (
                  <tr key={row.id} className="border-b border-hairline/60 hover:bg-bg-raised-2">
                    <td className="p-3">
                      <Checkbox
                        checked={selected.includes(row.id)}
                        onCheckedChange={() =>
                          setSelected((current) =>
                            current.includes(row.id)
                              ? current.filter((id) => id !== row.id)
                              : [...current, row.id],
                          )
                        }
                        aria-label={'Pilih artikel ' + row.title}
                        disabled={isBusy}
                      />
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <FileText className="mt-1 h-4 w-4 flex-none text-brass" />
                        <div className="min-w-0">
                          <button
                            className="block max-w-[38rem] truncate text-left font-medium text-paper hover:text-brass"
                            onClick={() => onEditArticle?.(row.id)}
                          >
                            {row.title}
                          </button>
                          <p className="m-0 font-mono text-[10px] text-paper-faint">{row.slug}</p>
                          {crossOrg && row.orgName ? (
                            <p className="m-0 text-[11px] text-paper-dim">{row.orgName}</p>
                          ) : null}
                          {row.tags?.length ? (
                            <p className="m-0 text-[10px] text-paper-faint">
                              {row.tags.slice(0, 3).join(' · ')}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className={statusTone}>
                        {statusLabel}
                      </Badge>
                    </td>
                    <td className="p-3 font-mono text-xs text-paper-dim">
                      {publication.portalCount} portal
                    </td>
                    <td className="p-3 whitespace-nowrap text-xs text-paper-dim">
                      {publicationLabel}
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label={'Ubah artikel ' + row.title}
                        onClick={() => onEditArticle?.(row.id)}
                        disabled={isBusy}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label={
                          (row.status === 'archived' ? 'Pulihkan' : 'Arsipkan') +
                          ' artikel ' +
                          row.title
                        }
                        onClick={() => void run(row, transition)}
                        disabled={isBusy}
                      >
                        {isBusy ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : row.status === 'archived' ? (
                          <ArchiveRestore className="h-4 w-4" />
                        ) : (
                          <Archive className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="text-error"
                        aria-label={'Hapus permanen artikel ' + row.title}
                        onClick={() => void run(row, 'article.delete')}
                        disabled={isBusy}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <DashboardPager
        startIndex={(safe - 1) * 20}
        visibleCount={visible.length}
        total={total}
        page={safe}
        pageCount={count}
        onPageChange={setPage}
      />
      {cursor !== null && onLoadMoreArticles ? (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => void onLoadMoreArticles()}>
            Muat artikel lebih lama
          </Button>
        </div>
      ) : null}
    </section>
  );
}
