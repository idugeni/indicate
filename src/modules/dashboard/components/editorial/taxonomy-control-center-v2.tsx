'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import {
  BookOpen,
  FolderTree,
  Hash,
  Layers3,
  Search,
  SlidersHorizontal,
  Tag,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/modules/dashboard/components/empty-state';
import type { DashboardCommand } from '@/modules/dashboard/command';

type Category = {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly status: string;
  readonly version: number;
  readonly articleCount: number;
};
type TopicTag = { readonly tag: string; readonly count: number };
type TaxonomySnapshot = {
  readonly categories: readonly Category[];
  readonly tags: readonly TopicTag[];
};
type TaxonomyFilter = 'all' | 'active' | 'inactive' | 'archived' | 'unused';

const TaxonomyManager = dynamic(
  () =>
    import('@/modules/dashboard/components/editorial/taxonomy-manager').then((module) => ({
      default: module.TaxonomyManager,
    })),
  {
    loading: () => (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    ),
  },
);

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function parseTaxonomy(value: unknown): TaxonomySnapshot {
  const body = asRecord(value);
  const categories = Array.isArray(body?.categories)
    ? body.categories.flatMap((value): Category[] => {
        const row = asRecord(value);
        if (
          row === null ||
          typeof row.id !== 'string' ||
          typeof row.name !== 'string' ||
          typeof row.slug !== 'string'
        )
          return [];
        return [
          {
            id: row.id,
            name: row.name,
            slug: row.slug,
            status: typeof row.status === 'string' ? row.status.toLowerCase() : 'active',
            version: typeof row.version === 'number' ? row.version : 0,
            articleCount:
              typeof row.articleCount === 'number' && Number.isFinite(row.articleCount)
                ? Math.max(0, row.articleCount)
                : 0,
          },
        ];
      })
    : [];
  const tags = Array.isArray(body?.tags)
    ? body.tags.flatMap((value): TopicTag[] => {
        const row = asRecord(value);
        if (row === null || typeof row.tag !== 'string') return [];
        return [
          {
            tag: row.tag,
            count:
              typeof row.count === 'number' && Number.isFinite(row.count)
                ? Math.max(0, row.count)
                : 0,
          },
        ];
      })
    : [];
  return { categories, tags };
}

function statusLabel(status: string): string {
  if (status === 'active') return 'Aktif';
  if (status === 'inactive') return 'Nonaktif';
  if (status === 'archived') return 'Arsip';
  return status || 'Tidak diketahui';
}
function statusVariant(status: string): 'secondary' | 'outline' | 'destructive' {
  if (status === 'active') return 'secondary';
  if (status === 'inactive') return 'destructive';
  return 'outline';
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  readonly icon: typeof Layers3;
  readonly label: string;
  readonly value: string;
  readonly detail: string;
}) {
  return (
    <Card className="rounded-lg border-hairline bg-bg-raised shadow-none">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="m-0 text-xs text-paper-dim">{label}</p>
          <Icon className="h-4 w-4 text-brass" aria-hidden="true" />
        </div>
        <p className="m-0 mt-3 font-mono text-2xl font-semibold tracking-tight text-paper">
          {value}
        </p>
        <p className="m-0 mt-1 text-xs text-paper-dim">{detail}</p>
      </CardContent>
    </Card>
  );
}

export function TaxonomyControlCenterV2({
  data,
  command,
  organizationId,
}: {
  readonly data: unknown;
  readonly command: DashboardCommand;
  readonly organizationId?: string;
}) {
  const snapshot = useMemo(() => parseTaxonomy(data), [data]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<TaxonomyFilter>('all');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const needle = query.trim().toLocaleLowerCase('id-ID');

  const filteredCategories = useMemo(
    () =>
      snapshot.categories.filter((category) => {
        const matchesQuery =
          needle === '' ||
          category.name.toLocaleLowerCase('id-ID').includes(needle) ||
          category.slug.toLocaleLowerCase('id-ID').includes(needle);
        const matchesFilter =
          filter === 'all' ||
          (filter === 'unused' ? category.articleCount === 0 : category.status === filter);
        return matchesQuery && matchesFilter;
      }),
    [filter, needle, snapshot.categories],
  );

  const filteredTags = useMemo(
    () =>
      snapshot.tags
        .filter((item) => needle === '' || item.tag.toLocaleLowerCase('id-ID').includes(needle))
        .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'id')),
    [needle, snapshot.tags],
  );

  const activeCategories = snapshot.categories.filter(
    (category) => category.status === 'active',
  ).length;
  const unusedCategories = snapshot.categories.filter(
    (category) => category.articleCount === 0,
  ).length;
  const inactiveCategories = snapshot.categories.filter(
    (category) => category.status !== 'active',
  ).length;
  const totalTagReferences = snapshot.tags.reduce((sum, item) => sum + item.count, 0);

  if (data === null || data === undefined) {
    return (
      <div role="status" aria-label="Memuat Taxonomy Studio" aria-busy="true" className="space-y-5">
        <Skeleton className="h-28 w-full" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-52 w-full" />
      </div>
    );
  }

  if (showAdvanced) {
    return (
      <div className="space-y-5">
        <header className="grid gap-4 border-b border-hairline pb-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <p className="m-0 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-brass">
              Editorial Intelligence · Metadata Quality
            </p>
            <h1 className="m-0 mt-1 font-serif text-2xl font-semibold tracking-tight text-paper sm:text-3xl">
              Taxonomy Studio
            </h1>
            <p className="m-0 mt-2 max-w-2xl text-sm leading-6 text-paper-dim">
              Buat, perbarui, arsipkan kategori, dan rapikan kosakata tag dalam workspace yang sama.
            </p>
          </div>
          <div className="inline-flex w-fit items-center gap-1 rounded-lg border border-hairline bg-bg-raised p-1" aria-label="Workspace taksonomi">
            <Button type="button" size="sm" variant="ghost" aria-pressed={!showAdvanced} onClick={() => setShowAdvanced(false)}>
              Ringkasan
            </Button>
            <Button type="button" size="sm" aria-pressed={showAdvanced} onClick={() => setShowAdvanced(true)}>
              Kelola kategori & tag
            </Button>
          </div>
        </header>
        <Card className="rounded-lg border-hairline bg-bg-raised shadow-none">
          <CardHeader className="border-b border-hairline pb-3">
            <CardTitle className="text-sm">Workflow CRUD taksonomi</CardTitle>
            <CardDescription>Perubahan kategori menggunakan versi data; penghapusan dan penggabungan tag tetap melalui aksi eksplisit.</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <TaxonomyManager data={data} command={command} organizationId={organizationId} />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="grid gap-4 border-b border-hairline pb-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <p className="m-0 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-brass">
            Editorial Intelligence · Metadata Quality
          </p>
          <h1 className="m-0 mt-1 font-serif text-2xl font-semibold tracking-tight text-paper sm:text-3xl">
            Taxonomy Studio
          </h1>
          <p className="m-0 mt-2 max-w-2xl text-sm leading-6 text-paper-dim">
            Jaga konsistensi kategori dan kosakata tag di seluruh workflow editorial. Temukan
            kategori yang belum dipakai, status yang perlu ditinjau, dan tag yang paling sering
            muncul.
          </p>
        </div>
        <div className="inline-flex w-fit items-center gap-1 rounded-lg border border-hairline bg-bg-raised p-1" aria-label="Workspace taksonomi">
          <Button type="button" size="sm" aria-pressed={!showAdvanced} onClick={() => setShowAdvanced(false)}>
            Ringkasan
          </Button>
          <Button type="button" size="sm" variant="ghost" aria-pressed={showAdvanced} onClick={() => setShowAdvanced(true)}>
            Kelola kategori & tag
          </Button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={FolderTree}
          label="Total kategori"
          value={String(snapshot.categories.length)}
          detail="Kategori pada snapshot dashboard"
        />
        <MetricCard
          icon={Layers3}
          label="Kategori aktif"
          value={String(activeCategories)}
          detail="Status aktif pada data sumber"
        />
        <MetricCard
          icon={BookOpen}
          label="Belum digunakan"
          value={String(unusedCategories)}
          detail="Kategori dengan nol artikel"
        />
        <MetricCard
          icon={Hash}
          label="Kosakata tag"
          value={String(snapshot.tags.length)}
          detail={totalTagReferences + ' asosiasi tag–artikel tercatat'}
        />
      </div>

      {inactiveCategories > 0 || unusedCategories > 0 ? (
        <Card className="rounded-lg border-warning/40 bg-warning/[0.04] shadow-none">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Layers3 className="h-4 w-4 text-warning" />
              <CardTitle className="text-sm">Perlu ditinjau</CardTitle>
            </div>
            <CardDescription>
              {inactiveCategories} kategori berstatus nonaktif atau arsip · {unusedCategories}{' '}
              kategori belum memiliki artikel.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button type="button" variant="outline" onClick={() => setFilter('unused')}>
              Tinjau kategori kosong
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card className="rounded-lg border-hairline bg-bg-raised shadow-none">
        <CardHeader className="border-b border-hairline pb-3">
          <div className="flex items-center gap-2">
            <FolderTree className="h-4 w-4 text-brass" />
            <CardTitle className="text-sm">Category directory</CardTitle>
          </div>
          <CardDescription>
            {filteredCategories.length} dari {snapshot.categories.length} kategori · gunakan filter
            untuk meninjau status dan pemakaian.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px] sm:items-end">
            <div className="space-y-2">
              <Label htmlFor="taxonomy-search">Cari kategori atau tag</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-paper-faint" />
                <Input
                  id="taxonomy-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Nama, slug, atau tag…"
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxonomy-filter">Status kategori</Label>
              <select
                id="taxonomy-filter"
                value={filter}
                onChange={(event) => setFilter(event.target.value as TaxonomyFilter)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
              >
                <option value="all">Semua kategori</option>
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
                <option value="archived">Arsip</option>
                <option value="unused">Belum digunakan</option>
              </select>
            </div>
          </div>
          {filteredCategories.length === 0 ? (
            <EmptyState
              title={
                snapshot.categories.length === 0 ? 'Belum ada kategori' : 'Kategori tidak ditemukan'
              }
              description={
                snapshot.categories.length === 0
                  ? 'Buat kategori pertama melalui pengelolaan taksonomi lengkap.'
                  : 'Ubah pencarian atau filter untuk melihat kategori lainnya.'
              }
              action={
                snapshot.categories.length === 0 ? (
                  <Button type="button" onClick={() => setShowAdvanced(true)}>
                    Buat kategori
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredCategories.map((category) => (
                <article
                  key={category.id}
                  aria-label={category.name}
                  className="min-w-0 rounded-lg border border-hairline p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="m-0 break-words text-sm font-semibold text-paper">
                        {category.name}
                      </h3>
                      <p className="m-0 mt-1 break-all font-mono text-xs text-paper-dim">
                        /{category.slug}
                      </p>
                    </div>
                    <Badge variant={statusVariant(category.status)}>
                      {statusLabel(category.status)}
                    </Badge>
                  </div>
                  <div className="mt-4 rounded-md bg-bg p-3">
                    <p className="m-0 text-[11px] uppercase tracking-wider text-paper-faint">
                      Artikel terkait
                    </p>
                    <p className="m-0 mt-1 font-mono text-lg text-paper">{category.articleCount}</p>
                  </div>
                  {category.articleCount === 0 ? (
                    <p className="m-0 mt-3 text-xs text-warning">Belum digunakan dalam artikel.</p>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-3 w-full"
                    onClick={() => setShowAdvanced(true)}
                  >
                    Kelola kategori
                  </Button>
                </article>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-lg border-hairline bg-bg-raised shadow-none">
        <CardHeader className="border-b border-hairline pb-3">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-brass" />
            <CardTitle className="text-sm">Tag vocabulary</CardTitle>
          </div>
          <CardDescription>
            Urutan berdasarkan jumlah asosiasi artikel dari data sumber, bukan estimasi AI.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {filteredTags.length === 0 ? (
            <EmptyState
              title={snapshot.tags.length === 0 ? 'Belum ada tag' : 'Tag tidak ditemukan'}
              description={
                snapshot.tags.length === 0
                  ? 'Tag akan muncul saat artikel menggunakan label tag.'
                  : 'Coba kata pencarian yang lain.'
              }
              compact
            />
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {filteredTags.slice(0, 18).map((item) => (
                <div
                  key={item.tag}
                  className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-hairline px-3 py-2.5"
                >
                  <span className="min-w-0 break-words text-sm text-paper">#{item.tag}</span>
                  <Badge variant="outline">{item.count}</Badge>
                </div>
              ))}
            </div>
          )}
          {filteredTags.length > 18 ? (
            <p className="m-0 mt-3 text-xs text-paper-dim">
              Menampilkan 18 dari {filteredTags.length} tag yang cocok. Buka pengelolaan lengkap
              untuk daftar dan aksi lanjutan.
            </p>
          ) : null}
          <div className="mt-4 flex justify-end">
            <Button type="button" variant="outline" onClick={() => setShowAdvanced(true)}>
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Kelola kategori & tag
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
