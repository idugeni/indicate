'use client';

import { useId, useMemo, useState } from 'react';
import { Newspaper } from 'lucide-react';
import { SectionCard } from '@/modules/dashboard/components/shared/section-card';
import { SearchCombobox } from '@/modules/dashboard/components/shared/search-combobox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ArchiveArticle {
  readonly id: string;
  readonly title: string;
  readonly slug: string;
  readonly status: string;
  readonly publishedAt: string | null;
  readonly tags: readonly string[];
  readonly categoryIds: readonly string[];
  readonly regionId: string;
}

interface ArchiveCategory {
  readonly id: string;
  readonly name: string;
}

interface ArchiveSite {
  readonly id: string;
  readonly normalizedHostname: string;
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

function formatDate(value: string | null): string {
  if (value === null) return '—';
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return '—';
  return new Date(time).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Jelajahi seluruh artikel organisasi lintas portal.
 *
 * @param data - Proyeksi `editorial.list` (artikel, kategori, situs, penugasan).
 * @returns Arsip baca-saja: cari, saring kategori/tag/portal/status, halaman 20.
 * @remarks Seluruh penyaringan sisi-klien agar satu muatan melayani semua
 * kombinasi; cocok untuk volume redaksi kini, dievaluasi ulang bila puluhan ribu.
 */
export function ArticleArchive({ data }: { readonly data: unknown }) {
  const model = data as {
    readonly articles?: readonly ArchiveArticle[];
    readonly categories?: readonly ArchiveCategory[];
    readonly sites?: readonly ArchiveSite[];
    readonly articleSites?: readonly ArchiveAssignment[];
  } | null;

  const articles = useMemo(() => [...(model?.articles ?? [])].sort((left, right) => right.slug.localeCompare(left.slug)), [model]);
  const categories = useMemo(() => model?.categories ?? [], [model]);
  const sites = useMemo(() => [...(model?.sites ?? [])].sort((left, right) => left.normalizedHostname.localeCompare(right.normalizedHostname)), [model]);
  const assignments = useMemo(() => model?.articleSites ?? [], [model]);

  const searchId = useId();
  const categoryId = useId();
  const tagId = useId();
  const siteId = useId();
  const statusId = useId();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [tag, setTag] = useState('');
  const [site, setSite] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const categoryNames = useMemo(() => new Map(categories.map((item) => [item.id, item.name] as const)), [categories]);
  const siteHostnames = useMemo(() => new Map(sites.map((item) => [item.id, item.normalizedHostname] as const)), [sites]);
  const sitesByArticle = useMemo(() => {
    const grouped = new Map<string, string[]>();
    for (const row of assignments) {
      if (row.active === false) continue;
      const hostname = siteHostnames.get(row.siteId);
      if (hostname === undefined) continue;
      const list = grouped.get(row.articleId) ?? [];
      if (!list.includes(hostname)) list.push(hostname);
      grouped.set(row.articleId, list.sort());
    }
    return grouped;
  }, [assignments, siteHostnames]);
  const allTags = useMemo(() => [...new Set(articles.flatMap((article) => article.tags))].sort(), [articles]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return articles.filter((article) => {
      if (needle !== '' && !`${article.title} ${article.slug}`.toLowerCase().includes(needle)) return false;
      if (category !== '' && !article.categoryIds.includes(category)) return false;
      if (tag !== '' && !article.tags.includes(tag)) return false;
      if (status !== '' && article.status !== status) return false;
      if (site !== '') {
        const hostnames = sitesByArticle.get(article.id) ?? [];
        if (!hostnames.includes(site)) return false;
      }
      return true;
    });
  }, [articles, search, category, tag, status, site, sitesByArticle]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const resetPage = () => setPage(1);

  return (
    <SectionCard icon={Newspaper} title={`Arsip berita (${filtered.length})`} eyebrow="Lintas portal">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-2">
          <Label htmlFor={searchId}>Cari judul/slug</Label>
          <Input id={searchId} value={search} onChange={(event) => { setSearch(event.target.value); resetPage(); }} placeholder="bencana wonosobo" />
        </div>
        <div className="space-y-2">
          <Label htmlFor={categoryId}>Kategori</Label>
          <SearchCombobox
            id={categoryId}
            value={category}
            onValueChange={(next) => { setCategory(next ?? ''); resetPage(); }}
            placeholder="Semua kategori"
            options={categories.map((item) => ({ value: item.id, label: item.name }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={tagId}>Tag</Label>
          <SearchCombobox
            id={tagId}
            value={tag}
            onValueChange={(next) => { setTag(next ?? ''); resetPage(); }}
            placeholder="Semua tag"
            options={allTags.map((item) => ({ value: item, label: item }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={siteId}>Portal</Label>
          <SearchCombobox
            id={siteId}
            value={site}
            onValueChange={(next) => { setSite(next ?? ''); resetPage(); }}
            placeholder="Semua portal"
            options={sites.map((item) => ({ value: item.normalizedHostname, label: item.normalizedHostname }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={statusId}>Status</Label>
          <SearchCombobox
            id={statusId}
            value={status}
            onValueChange={(next) => { setStatus(next ?? ''); resetPage(); }}
            placeholder="Semua status"
            options={Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))}
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="m-0 pt-4 font-sans text-sm text-paper-faint">Tidak ada artikel yang cocok. Longgarkan saringan.</p>
      ) : (
        <div className="min-w-0 pt-4">
          <Table className="w-full table-fixed text-sm">
            <TableCaption className="sr-only">Arsip artikel lintas portal</TableCaption>
            <TableHeader>
              <TableRow className="border-b border-hairline hover:bg-transparent">
                <TableHead className="px-2 py-2 font-mono text-[11px] font-medium uppercase tracking-wider text-paper-faint">Judul</TableHead>
                <TableHead className="hidden px-2 py-2 font-mono text-[11px] font-medium uppercase tracking-wider text-paper-faint lg:table-cell lg:w-32">Portal</TableHead>
                <TableHead className="hidden px-2 py-2 font-mono text-[11px] font-medium uppercase tracking-wider text-paper-faint lg:table-cell lg:w-28">Kategori</TableHead>
                <TableHead className="hidden px-2 py-2 font-mono text-[11px] font-medium uppercase tracking-wider text-paper-faint lg:table-cell lg:w-32">Tag</TableHead>
                <TableHead className="w-16 px-2 py-2 font-mono text-[11px] font-medium uppercase tracking-wider text-paper-faint sm:w-20">Status</TableHead>
                <TableHead className="hidden px-2 py-2 font-mono text-[11px] font-medium uppercase tracking-wider text-paper-faint sm:table-cell sm:w-24">Terbit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((article) => {
                const portalNames = sitesByArticle.get(article.id) ?? [];
                const categoryLabels = article.categoryIds
                  .map((id) => categoryNames.get(id))
                  .filter((name): name is string => name !== undefined);
                const tagLabels = article.tags.length > 0 ? article.tags.map((item) => `#${item}`).join(' ') : '—';
                return (
                  <TableRow key={article.id} className="border-b border-hairline align-top last:border-0">
                    <TableCell className="min-w-0 whitespace-normal px-2 py-2">
                      <p className="m-0 break-words font-medium text-paper">{article.title}</p>
                      <p className="m-0 break-all font-mono text-[11px] text-paper-faint">/{article.slug}</p>
                      <p className="m-0 mt-1 break-words font-sans text-xs leading-relaxed text-paper-dim lg:hidden">
                        {portalNames.join(', ') || '—'} · {categoryLabels.join(', ') || '—'}
                      </p>
                      <p className="m-0 mt-0.5 break-words font-sans text-xs text-paper-faint lg:hidden">
                        {tagLabels}
                        <span className="sm:hidden"> · {formatDate(article.publishedAt)}</span>
                      </p>
                    </TableCell>
                    <TableCell className="hidden break-words whitespace-normal px-2 py-2 text-paper-dim lg:table-cell">{portalNames.join(', ') || '—'}</TableCell>
                    <TableCell className="hidden break-words whitespace-normal px-2 py-2 text-paper-dim lg:table-cell">{categoryLabels.join(', ') || '—'}</TableCell>
                    <TableCell className="hidden break-words whitespace-normal px-2 py-2 text-paper-dim lg:table-cell">{tagLabels}</TableCell>
                    <TableCell className="break-words whitespace-normal px-2 py-2 text-paper-dim">{STATUS_LABELS[article.status] ?? article.status}</TableCell>
                    <TableCell className="hidden whitespace-nowrap px-2 py-2 tabular-nums text-paper-dim sm:table-cell">{formatDate(article.publishedAt)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <span role="status" aria-live="polite" aria-atomic="true" className="font-mono text-[11px] tabular-nums text-paper-faint">
          {filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} dari {filtered.length}
        </span>
        <Pagination className="mx-0 w-auto">
          <PaginationContent className="gap-4">
            <PaginationItem>
              <PaginationPrevious text="Sebelumnya"
                href="#"
                aria-label="Ke halaman sebelumnya"
                aria-disabled={safePage <= 1}
                tabIndex={safePage <= 1 ? -1 : 0}
                onClick={(event) => {
                  event.preventDefault();
                  if (safePage > 1) setPage(safePage - 1);
                }}
                className={`px-0 font-sans text-xs text-paper transition-colors hover:text-brass ${safePage <= 1 ? 'pointer-events-none opacity-40' : 'cursor-pointer'}`}
              />
            </PaginationItem>
            <PaginationItem>
              <span className="font-mono text-[11px] tabular-nums text-paper-faint">
                {safePage} / {pageCount}
              </span>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext text="Berikutnya"
                href="#"
                aria-label="Ke halaman berikutnya"
                aria-disabled={safePage >= pageCount}
                tabIndex={safePage >= pageCount ? -1 : 0}
                onClick={(event) => {
                  event.preventDefault();
                  if (safePage < pageCount) setPage(safePage + 1);
                }}
                className={`px-0 font-sans text-xs text-paper transition-colors hover:text-brass ${safePage >= pageCount ? 'pointer-events-none opacity-40' : 'cursor-pointer'}`}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </SectionCard>
  );
}
