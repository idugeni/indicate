'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Archive,
  CheckCircle2,
  FileImage,
  Grid2X2,
  ImageIcon,
  List,
  Loader2,
  Search,
  Sparkles,
  UploadCloud,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DashboardSelect, DashboardSelectItem } from '@/modules/dashboard/components/shared/dashboard-select';
import type { DashboardCommand } from '@/modules/dashboard/command';
import type { LibraryMedia } from '@/modules/dashboard/components/publishing/media-library';
import { AiMediaAnalyze } from '@/modules/ai/components/ai-media-analyze';
import { formatBytes } from '@/modules/publishing/compress-image';

const MediaForm = dynamic(
  () => import('@/modules/dashboard/components/publishing/media-form').then((module) => ({ default: module.MediaForm })),
  { loading: () => <div className="rounded-md border border-hairline bg-bg-raised p-4 font-mono text-xs text-paper-dim">Menyiapkan pipeline unggah…</div> },
);

type MediaOwnerKind = 'organization' | 'article' | 'site';

interface MediaLibraryV2Model {
  readonly media?: readonly LibraryMedia[];
  readonly nextCursor?: string | null;
  readonly mediaCounts?: readonly { readonly kind: MediaOwnerKind; readonly count: number; readonly bytes: number }[];
  readonly articles?: readonly { readonly id: string; readonly title?: string }[];
  readonly sites?: readonly { readonly id: string; readonly normalizedHostname: string }[];
}

interface MediaLibraryV2Props {
  readonly data: unknown;
  readonly command: DashboardCommand;
  readonly organizationId?: string | undefined;
}

interface SignedAssetAuthorization {
  readonly url: string;
  readonly headers: Record<string, string>;
}

const PAGE_SIZE = 24;
const PREVIEWABLE = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/x-icon']);

function fileNameOf(objectKey: string): string {
  return objectKey.split('/').filter(Boolean).at(-1) ?? objectKey;
}

function readPage(value: unknown): { readonly items: readonly LibraryMedia[]; readonly next: string | null } | null {
  if (typeof value !== 'object' || value === null) return null;
  const record = value as { readonly items?: unknown; readonly nextCursor?: unknown };
  if (!Array.isArray(record.items)) return null;
  return {
    items: record.items.filter((item): item is LibraryMedia =>
      typeof item === 'object' && item !== null &&
      typeof (item as LibraryMedia).id === 'string' &&
      typeof (item as LibraryMedia).objectKey === 'string',
    ),
    next: typeof record.nextCursor === 'string' && record.nextCursor !== '' ? record.nextCursor : null,
  };
}

function ownerLabel(item: LibraryMedia, model: MediaLibraryV2Model | null): string {
  if (item.owner.kind === 'article') {
    return model?.articles?.find((article) => article.id === item.owner.articleId)?.title ?? 'Artikel jaringan';
  }
  if (item.owner.kind === 'site') {
    return model?.sites?.find((site) => site.id === item.owner.siteId)?.normalizedHostname ?? 'Portal regional';
  }
  return 'Organisasi';
}

export function MediaLibraryV2({ data, command, organizationId }: MediaLibraryV2Props) {
  const model = useMemo(() => (data as MediaLibraryV2Model | null) ?? {}, [data]);
  const baseItems = model.media ?? [];
  const counts = model.mediaCounts ?? [];
  const [search, setSearch] = useState('');
  const [owner, setOwner] = useState<'all' | MediaOwnerKind>('all');
  const [state, setState] = useState('all');
  const querySignature = `${search.trim()}|${owner}|${state}`;
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');
  const [selectedId, setSelectedId] = useState(items[0]?.id ?? '');
  const [drawer, setDrawer] = useState<'none' | 'upload' | 'ai'>('none');
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Record<string, SignedAssetAuthorization>>({});
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [page, setPage] = useState<{ readonly key: string; readonly items: readonly LibraryMedia[]; readonly next: string | null }>({ key: '', items: [], next: null });
  const appended = page.key === querySignature ? page.items : [];
  const items = useMemo(() => {
    const known = new Set(baseItems.map((item) => item.id));
    return [...baseItems, ...appended.filter((item) => !known.has(item.id))];
  }, [baseItems, appended]);
  const cursor = page.key === querySignature
    ? page.next
    : querySignature === '||'
      ? model.nextCursor ?? null
      : null;

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return items.filter((item) => {
      if (owner !== 'all' && item.owner.kind !== owner) return false;
      if (state !== 'all' && item.state !== state) return false;
      if (needle === '') return true;
      return `${fileNameOf(item.objectKey)} ${item.altText ?? ''} ${item.caption ?? ''} ${ownerLabel(item, model)}`
        .toLowerCase()
        .includes(needle);
    });
  }, [items, owner, state, search, model]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (search.trim() === '' && owner === 'all' && state === 'all') return;
      setLoadingList(true);
      setListError(null);
      void (async () => {
        try {
          const nextPage = readPage(await command('media.list', {
            limit: PAGE_SIZE,
            ...(search.trim() === '' ? {} : { search: search.trim() }),
            ...(owner === 'all' ? {} : { owner }),
            ...(state === 'all' ? {} : { state }),
          }));
          if (page === null) throw new Error('Invalid media page');
          const requestKey = `${search.trim()}|${owner}|${state}`;
          setPage({ key: requestKey, items: [], next: page.next });
          setSelectedId(page.items[0]?.id ?? '');
        } catch {
          setListError('Gagal memuat scope media. Coba ubah filter atau ulangi.');
        } finally {
          setLoadingList(false);
        }
      })();
    }, 350);
    return () => window.clearTimeout(timer);
  }, [search, owner, state, command]);

  const selected = filtered.find((item) => item.id === selectedId) ?? filtered[0] ?? null;
  const totalBytes = useMemo(() => items.reduce((sum, item) => sum + item.sizeBytes, 0), [items]);
  const activeCount = useMemo(() => items.filter((item) => item.state === 'active').length, [items]);
  const archivedCount = useMemo(() => items.filter((item) => item.state === 'archived').length, [items]);
  const serverTotal = counts.reduce((sum, item) => sum + item.count, 0);

  const requestPreview = async (item: LibraryMedia) => {
    if (preview[item.id]) return;
    setPreviewingId(item.id);
    try {
      const result = await command('media.read', { mediaId: item.id }) as {
        readonly url?: string;
        readonly requiredHeaders?: Record<string, string>;
      } | null;
      if (!result?.url || !result.requiredHeaders) {
        toast.error('Otorisasi pratinjau tidak tersedia.');
        return;
      }
      setPreview((current) => ({ ...current, [item.id]: { url: result.url!, headers: result.requiredHeaders! } }));
    } catch {
      toast.error('Gagal meminta otorisasi baca media.');
    } finally {
      setPreviewingId(null);
    }
  };

  const loadMore = async () => {
    if (cursor === null || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = readPage(await command('media.list', {
        limit: PAGE_SIZE,
        cursor,
        ...(search.trim() === '' ? {} : { search: search.trim() }),
        ...(owner === 'all' ? {} : { owner }),
        ...(state === 'all' ? {} : { state }),
      }));
      if (nextPage === null) throw new Error('Invalid media page');
      const currentItems = page.key === querySignature ? page.items : [];
      const known = new Set(currentItems.map((item) => item.id));
      setPage({ key: querySignature, items: [...currentItems, ...nextPage.items.filter((item) => !known.has(item.id))], next: nextPage.next });
    } catch {
      setListError('Gagal memuat halaman aset berikutnya.');
    } finally {
      setLoadingMore(false);
    }
  };

  const countsFor = (kind: MediaOwnerKind) => {
    const hit = counts.find((item) => item.kind === kind);
    return hit?.count ?? items.filter((item) => item.owner.kind === kind).length;
  };

  return (
    <section aria-label="Media Library V2" className="space-y-4">
      <header className="flex flex-col gap-3 border-b border-hairline pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-brass">Asset Command Center</p>
          <h1 className="mt-1 font-sans text-xl font-semibold tracking-tight text-paper sm:text-2xl">Media Library</h1>
          <p className="mt-1 max-w-2xl font-sans text-xs leading-relaxed text-paper-dim">Cari, inspeksi, dan distribusikan aset tanpa meninggalkan konteks portal dan artikel.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant={drawer === 'ai' ? 'default' : 'outline'} size="sm" onClick={() => setDrawer(drawer === 'ai' ? 'none' : 'ai')}><Sparkles className="h-3.5 w-3.5" />Studio AI</Button>
          <Button type="button" size="sm" onClick={() => setDrawer(drawer === 'upload' ? 'none' : 'upload')}><UploadCloud className="h-3.5 w-3.5" />Unggah aset</Button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-lg border border-hairline bg-bg-raised p-3"><span className="font-mono text-[10px] uppercase text-paper-faint">Total aset</span><p className="mt-1 font-mono text-xl text-paper">{(serverTotal || items.length).toLocaleString('id-ID')}</p></div>
        <div className="rounded-lg border border-hairline bg-bg-raised p-3"><span className="font-mono text-[10px] uppercase text-paper-faint">Aktif</span><p className="mt-1 font-mono text-xl text-emerald-400">{activeCount.toLocaleString('id-ID')}</p></div>
        <div className="rounded-lg border border-hairline bg-bg-raised p-3"><span className="font-mono text-[10px] uppercase text-paper-faint">Arsip</span><p className="mt-1 font-mono text-xl text-amber-400">{archivedCount.toLocaleString('id-ID')}</p></div>
        <div className="rounded-lg border border-hairline bg-bg-raised p-3"><span className="font-mono text-[10px] uppercase text-paper-faint">Data scope</span><p className="mt-1 font-mono text-xl text-paper">{formatBytes(totalBytes)}</p></div>
      </div>

      {drawer !== 'none' ? (
        <div className="rounded-lg border border-hairline bg-bg-raised p-4">
          <div className="mb-3 flex items-center justify-between border-b border-hairline pb-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-paper-faint">{drawer === 'upload' ? 'Upload pipeline' : 'Optional AI assist'}</p>
              <h2 className="mt-1 font-sans text-sm font-semibold text-paper">{drawer === 'upload' ? 'Tambah aset ke repositori' : 'Analisis visual'}</h2>
            </div>
            <Button type="button" variant="ghost" size="icon-xs" aria-label="Tutup panel" onClick={() => setDrawer('none')}><X className="h-4 w-4" /></Button>
          </div>
          {drawer === 'upload' ? <MediaForm data={data} command={command} /> : (
            <AiMediaAnalyze organizationId={organizationId} onDraft={(draft) => toast.info(draft.alt === '' ? draft.title : `Alt text: ${draft.alt}`)} />
          )}
        </div>
      ) : null}

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 rounded-lg border border-hairline bg-bg-raised">
          <div className="border-b border-hairline p-3">
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_150px_150px_auto]">
              <div className="relative">
                <Label htmlFor="media-v2-search" className="sr-only">Cari aset</Label>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-paper-faint" />
                <Input id="media-v2-search" aria-label="Cari aset" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nama, alt text, caption, pemilik…" className="pl-9" />
              </div>
              <DashboardSelect aria-label="Folder media" value={owner} onValueChange={(value) => setOwner((value ?? 'all') as typeof owner)} placeholder="Folder">
                <DashboardSelectItem value="all">Semua scope</DashboardSelectItem>
                <DashboardSelectItem value="organization">Organisasi ({countsFor('organization')})</DashboardSelectItem>
                <DashboardSelectItem value="article">Artikel ({countsFor('article')})</DashboardSelectItem>
                <DashboardSelectItem value="site">Portal ({countsFor('site')})</DashboardSelectItem>
              </DashboardSelect>
              <DashboardSelect aria-label="Status media" value={state} onValueChange={(value) => setState(value ?? 'all')} placeholder="Status">
                <DashboardSelectItem value="all">Semua status</DashboardSelectItem>
                <DashboardSelectItem value="active">Aktif</DashboardSelectItem>
                <DashboardSelectItem value="archived">Arsip</DashboardSelectItem>
                <DashboardSelectItem value="rejected">Ditolak</DashboardSelectItem>
              </DashboardSelect>
              <div className="flex justify-end gap-1">
                <Button type="button" size="icon-sm" variant={layout === 'grid' ? 'default' : 'outline'} aria-label="Tampilan grid" onClick={() => setLayout('grid')}><Grid2X2 className="h-4 w-4" /></Button>
                <Button type="button" size="icon-sm" variant={layout === 'list' ? 'default' : 'outline'} aria-label="Tampilan list" onClick={() => setLayout('list')}><List className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>

          {listError ? <div className="border-b border-error/30 bg-error/[0.06] px-4 py-3 text-xs text-error">{listError}</div> : null}
          {loadingList ? <div className="flex items-center gap-2 border-b border-hairline px-4 py-2 font-mono text-[10px] text-paper-faint"><Loader2 className="h-3 w-3 animate-spin" />Memuat scope aset…</div> : null}

          {filtered.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <FileImage className="mx-auto h-8 w-8 text-paper-faint" />
              <p className="mt-3 font-sans text-sm font-medium text-paper">Tidak ada aset pada scope ini.</p>
              <p className="mt-1 font-sans text-xs text-paper-dim">Ubah filter atau unggah aset baru.</p>
            </div>
          ) : (
            <div className={layout === 'grid' ? 'grid grid-cols-2 gap-px bg-hairline sm:grid-cols-3' : 'divide-y divide-hairline'}>
              {filtered.map((item) => (
                <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} aria-pressed={selected?.id === item.id} className={layout === 'grid' ? 'group bg-bg-raised p-2 text-left hover:bg-bg-raised-2' : 'flex w-full items-center gap-3 bg-bg-raised p-3 text-left hover:bg-bg-raised-2'}>
                  <div className={layout === 'grid' ? 'flex aspect-square items-center justify-center overflow-clip rounded border border-hairline bg-bg' : 'flex h-12 w-12 shrink-0 items-center justify-center overflow-clip rounded border border-hairline bg-bg'}>
                    {preview[item.id] ? (<>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview[item.id]!.url} alt={item.altText ?? fileNameOf(item.objectKey)} className="h-full w-full object-cover" {...preview[item.id]!.headers} />
                  </>) : <ImageIcon className="h-7 w-7 text-paper-faint" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-sans text-xs font-medium text-paper">{fileNameOf(item.objectKey)}</p>
                    <p className="mt-0.5 truncate font-mono text-[9px] text-paper-faint">{ownerLabel(item, model)} · {formatBytes(item.sizeBytes)}</p>
                  </div>
                  {item.state === 'active' ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" /> : <Archive className="h-3.5 w-3.5 shrink-0 text-amber-400" />}
                </button>
              ))}
            </div>
          )}

          {cursor !== null ? <div className="border-t border-hairline p-3 text-center"><Button type="button" variant="outline" size="sm" onClick={() => void loadMore()} disabled={loadingMore}>{loadingMore ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}{loadingMore ? 'Memuat…' : 'Muat halaman berikutnya'}</Button></div> : null}
        </div>

        <aside className="min-w-0">
          {selected === null ? (
            <div className="rounded-lg border border-dashed border-hairline-strong p-10 text-center text-paper-dim">Pilih aset untuk membuka inspector.</div>
          ) : (
            <div className="rounded-lg border border-hairline bg-bg-raised">
              <div className="border-b border-hairline p-3">
                <p className="font-mono text-[10px] uppercase tracking-wider text-brass">Asset inspector</p>
                <h2 className="mt-1 truncate font-sans text-sm font-semibold text-paper">{fileNameOf(selected.objectKey)}</h2>
              </div>
              <div className="space-y-3 p-3">
                <div className="flex aspect-video items-center justify-center overflow-clip rounded border border-hairline bg-bg">
                  {preview[selected.id] ? (<>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview[selected.id]!.url} alt={selected.altText ?? fileNameOf(selected.objectKey)} className="max-h-full max-w-full object-contain" {...preview[selected.id]!.headers} />
                  </>) : <FileImage className="h-10 w-10 text-paper-faint" />}
                </div>
                {PREVIEWABLE.has(selected.mediaType) && !preview[selected.id] ? <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => void requestPreview(selected)} disabled={previewingId === selected.id}>{previewingId === selected.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}{previewingId === selected.id ? 'Meminta otorisasi…' : 'Buka pratinjau aman'}</Button> : null}
                <dl className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded border border-hairline bg-bg p-2"><dt className="font-mono text-[9px] uppercase text-paper-faint">MIME</dt><dd className="mt-1 font-mono text-paper">{selected.mediaType}</dd></div>
                  <div className="rounded border border-hairline bg-bg p-2"><dt className="font-mono text-[9px] uppercase text-paper-faint">Ukuran</dt><dd className="mt-1 font-mono text-paper">{formatBytes(selected.sizeBytes)}</dd></div>
                  <div className="rounded border border-hairline bg-bg p-2"><dt className="font-mono text-[9px] uppercase text-paper-faint">Dimensi</dt><dd className="mt-1 font-mono text-paper">{selected.widthPx && selected.heightPx ? `${selected.widthPx}×${selected.heightPx}` : '—'}</dd></div>
                  <div className="rounded border border-hairline bg-bg p-2"><dt className="font-mono text-[9px] uppercase text-paper-faint">Status</dt><dd className="mt-1 font-mono text-paper">{selected.state}</dd></div>
                </dl>
                <div className="rounded border border-hairline bg-bg p-2.5">
                  <p className="font-mono text-[9px] uppercase text-paper-faint">Pemilik</p>
                  <p className="mt-1 truncate font-sans text-xs text-paper">{ownerLabel(selected, model)}</p>
                  <p className="mt-0.5 break-all font-mono text-[9px] text-paper-dim">{selected.objectKey}</p>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
