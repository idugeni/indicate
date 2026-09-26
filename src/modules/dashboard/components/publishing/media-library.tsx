'use client';

import { useId, useMemo, useState } from 'react';
import {
  Archive,
  Building2,
  FileText,
  FolderOpen,
  Globe,
  Grid2x2,
  ImageIcon,
  List,
  Loader2,
  UploadCloud,
} from 'lucide-react';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { DashboardSelect, DashboardSelectItem } from '@/modules/dashboard/components/shared/dashboard-select';
import { formatBytes } from '@/modules/publishing/compress-image';

/** The uploader carries the compression pipeline, so it only loads once opened. */
const MediaForm = dynamic(
  () => import('@/modules/dashboard/components/publishing/media-form').then((module) => ({ default: module.MediaForm })),
  { loading: () => <p className="m-0 font-mono text-xs text-paper-faint">Menyiapkan formulir unggah…</p> },
);

type MediaOwnerKind = 'organization' | 'article' | 'site';

interface MediaOwner {
  readonly kind: MediaOwnerKind;
  readonly articleId?: string | null;
  readonly siteId?: string | null;
}

export interface LibraryMedia {
  readonly id: string;
  readonly objectKey: string;
  readonly purpose: string;
  readonly mediaType: string;
  readonly sizeBytes: number;
  readonly widthPx?: number | null;
  readonly heightPx?: number | null;
  readonly altText?: string | null;
  readonly caption?: string | null;
  readonly owner: MediaOwner;
  readonly state: string;
  readonly createdAt: string;
}

interface LibraryModel {
  readonly media?: readonly LibraryMedia[];
  readonly articles?: readonly { readonly id: string; readonly title?: string }[];
  readonly sites?: readonly { readonly id: string; readonly normalizedHostname: string }[];
}

interface MediaLibraryProps {
  readonly data: unknown;
  readonly command: (action: string, payload: unknown) => Promise<unknown>;
}

interface Folder {
  readonly key: string;
  readonly label: string;
  readonly hint: string;
  readonly icon: typeof Building2;
  readonly count: number;
  readonly bytes: number;
}

const STATE_LABELS: Readonly<Record<string, string>> = {
  active: 'Aktif',
  archived: 'Arsip',
  rejected: 'Ditolak',
};

const PREVIEWABLE = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/x-icon']);

/** Tiles rendered per pass; the network library already holds hundreds of assets. */
const PAGE_SIZE = 48;

/** Last path segment of an object key, which is the stored filename. */
function fileNameOf(objectKey: string): string {
  const segments = objectKey.split('/').filter((segment) => segment.length > 0);
  return segments[segments.length - 1] ?? objectKey;
}

/** Short format mark for a tile that has no preview loaded. */
function formatMark(mediaType: string): string {
  const subtype = mediaType.split('/')[1] ?? '';
  return (subtype.split('+')[0] ?? subtype).toUpperCase().slice(0, 4) || 'GAMBAR';
}

function ownerLabel(media: LibraryMedia, model: LibraryModel | null): string {
  if (media.owner.kind === 'article') {
    return model?.articles?.find((item) => item.id === media.owner.articleId)?.title ?? 'Artikel';
  }
  if (media.owner.kind === 'site') {
    return model?.sites?.find((item) => item.id === media.owner.siteId)?.normalizedHostname ?? 'Situs';
  }
  return 'Organisasi';
}

/**
 * Browse the tenant media library the way a file browser reads: brand folders
 * first, then a searchable grid of the assets inside the selected folder.
 *
 * @remarks The only hierarchy media carries is its owner, so the folder row maps
 * one-to-one onto `media.owner` instead of inventing a taxonomy. Previews stay
 * unsigned until the editor asks for one: `media.read` mints a short-lived exact
 * authorization per asset, so a library of hundreds of rows never signs hundreds
 * of URLs on load.
 */
export function MediaLibrary({ data, command }: MediaLibraryProps) {
  const model = data as LibraryModel | null;
  const searchId = useId();
  const purposeId = useId();
  const stateId = useId();

  const [folder, setFolder] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [purpose, setPurpose] = useState('');
  const [state, setState] = useState('');
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');
  const [uploading, setUploading] = useState(false);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [preview, setPreview] = useState<{ readonly url: string; readonly headers: Record<string, string> } | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [previewName, setPreviewName] = useState('');

  const media = useMemo(() => model?.media ?? [], [model]);
  const purposes = useMemo(() => [...new Set(media.map((item) => item.purpose))].sort(), [media]);

  const folders = useMemo<readonly Folder[]>(() => {
    const group = (kind: MediaOwnerKind) => {
      const rows = media.filter((item) => item.owner.kind === kind);
      return { count: rows.length, bytes: rows.reduce((total, item) => total + item.sizeBytes, 0) };
    };
    const organization = group('organization');
    const article = group('article');
    const site = group('site');
    return [
      { key: 'all', label: 'Semua media', hint: `${media.length.toLocaleString('id-ID')} aset`, icon: FolderOpen, count: media.length, bytes: media.reduce((total, item) => total + item.sizeBytes, 0) },
      { key: 'organization', label: 'Organisasi', hint: 'Aset milik jaringan', icon: Building2, ...organization },
      { key: 'article', label: 'Artikel', hint: 'Gambar sampul artikel', icon: FileText, ...article },
      { key: 'site', label: 'Situs', hint: 'Logo & favicon portal', icon: Globe, ...site },
    ];
  }, [media]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return media.filter((item) => {
      if (folder !== 'all' && item.owner.kind !== folder) return false;
      if (purpose !== '' && item.purpose !== purpose) return false;
      if (state !== '' && item.state !== state) return false;
      if (needle === '') return true;
      return `${fileNameOf(item.objectKey)} ${item.altText ?? ''} ${item.caption ?? ''} ${ownerLabel(item, model)}`
        .toLowerCase()
        .includes(needle);
    });
  }, [folder, media, model, purpose, search, state]);

  const visible = useMemo(() => filtered.slice(0, limit), [filtered, limit]);
  const remaining = filtered.length - visible.length;
  const resetWindow = (): void => setLimit(PAGE_SIZE);

  const totalBytes = useMemo(() => media.reduce((total, item) => total + item.sizeBytes, 0), [media]);
  const activeCount = useMemo(() => media.filter((item) => item.state === 'active').length, [media]);
  const archivedCount = useMemo(() => media.filter((item) => item.state === 'archived').length, [media]);

  const openPreview = async (item: LibraryMedia): Promise<void> => {
    setPreviewBusy(true);
    setPreviewName(fileNameOf(item.objectKey));
    try {
      const authorization = await command('media.read', { mediaId: item.id }) as {
        readonly url?: string;
        readonly requiredHeaders?: Record<string, string>;
      } | null;
      if (authorization?.url === undefined || authorization.requiredHeaders === undefined) {
        toast.error('Pratinjau tidak tersedia untuk aset ini.');
        return;
      }
      setPreview({ url: authorization.url, headers: authorization.requiredHeaders });
    } catch {
      toast.error('Gagal meminta izin akses media.');
    } finally {
      setPreviewBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <section aria-label="Ringkasan pustaka media" className="rounded border border-hairline bg-bg-raised p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="m-0 font-sans text-sm font-semibold tracking-tight text-paper">Gudang aset jaringan</h2>
            <p className="m-0 font-mono text-[11px] tabular-nums text-paper-faint">
              {media.length.toLocaleString('id-ID')} aset · {formatBytes(totalBytes)} · {activeCount.toLocaleString('id-ID')} aktif · {archivedCount.toLocaleString('id-ID')} diarsipkan
            </p>
          </div>
          <Button type="button" size="sm" variant={uploading ? 'outline' : 'default'} onClick={() => setUploading((open) => !open)} className="flex-none">
            {uploading ? <List className="h-3.5 w-3.5" aria-hidden="true" /> : <UploadCloud className="h-3.5 w-3.5" aria-hidden="true" />}
            <span>{uploading ? 'Tutup unggah' : 'Unggah media'}</span>
          </Button>
        </div>
      </section>

      {uploading ? <MediaForm data={data} command={command} /> : null}

      <section aria-label="Folder media" className="flex flex-wrap gap-1.5">
        {folders.map((entry) => {
          const Icon = entry.icon;
          const selected = folder === entry.key;
          return (
            <button
              key={entry.key}
              type="button"
              onClick={() => { setFolder(entry.key); resetWindow(); }}
              aria-pressed={selected}
              className={`flex min-w-0 items-center gap-1.5 rounded border px-2.5 py-1.5 text-left transition-colors duration-150 ${
                selected
                  ? 'border-brass/60 bg-bg-raised-2'
                  : 'border-hairline bg-bg-raised hover:border-hairline-strong hover:bg-bg-raised-2'
              }`}
            >
              <Icon className={`h-3.5 w-3.5 flex-none ${selected ? 'text-brass' : 'text-paper-faint'}`} aria-hidden="true" />
              <span className="truncate font-sans text-xs font-medium text-paper">{entry.label}</span>
              <span className="font-mono text-[11px] tabular-nums text-paper-faint">{entry.count.toLocaleString('id-ID')}</span>
              <span className="sr-only">{entry.hint}</span>
            </button>
          );
        })}
      </section>

      <section aria-label="Aset media" className="rounded border border-hairline bg-bg-raised p-3">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_170px_140px_auto] lg:items-center">
          <div className="space-y-1">
            <Label htmlFor={searchId} className="font-sans text-[11px] font-medium text-paper-dim">Cari aset</Label>
            <Input
              id={searchId}
              value={search}
              onChange={(event) => { setSearch(event.target.value); resetWindow(); }}
              placeholder="nama berkas, alt text, atau pemilik"
              className="h-8 border-hairline-strong bg-bg px-2.5 font-mono text-xs text-paper focus-visible:ring-brass"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor={purposeId} className="font-sans text-[11px] font-medium text-paper-dim">Tujuan</Label>
            <DashboardSelect id={purposeId} value={purpose} onValueChange={(next) => { setPurpose(next ?? ''); resetWindow(); }} placeholder="Semua tujuan">
              {purposes.map((item) => (
                <DashboardSelectItem key={item} value={item}>{item}</DashboardSelectItem>
              ))}
            </DashboardSelect>
          </div>

          <div className="space-y-1">
            <Label htmlFor={stateId} className="font-sans text-[11px] font-medium text-paper-dim">Status</Label>
            <DashboardSelect id={stateId} value={state} onValueChange={(next) => { setState(next ?? ''); resetWindow(); }} placeholder="Semua status">
              {Object.entries(STATE_LABELS).map(([value, label]) => (
                <DashboardSelectItem key={value} value={value}>{label}</DashboardSelectItem>
              ))}
            </DashboardSelect>
          </div>

          <ToggleGroup
            variant="outline"
            size="sm"
            value={[layout]}
            onValueChange={(values) => {
              const next = values[values.length - 1];
              if (next === 'grid' || next === 'list') setLayout(next);
            }}
            aria-label="Tata letak aset"
            className="justify-self-start lg:justify-self-end"
          >
            <ToggleGroupItem value="grid" aria-label="Tata letak kisi" className="aria-pressed:border-brass/60 aria-pressed:text-paper">
              <Grid2x2 className="h-3.5 w-3.5" aria-hidden="true" />
            </ToggleGroupItem>
            <ToggleGroupItem value="list" aria-label="Tata letak daftar" className="aria-pressed:border-brass/60 aria-pressed:text-paper">
              <List className="h-3.5 w-3.5" aria-hidden="true" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <p role="status" aria-live="polite" className="m-0 mt-2 font-mono text-[11px] tabular-nums text-paper-faint">
          {filtered.length.toLocaleString('id-ID')} dari {media.length.toLocaleString('id-ID')} aset
        </p>

        {filtered.length === 0 ? (
          <p className="m-0 mt-2 rounded border border-hairline bg-bg p-3 font-sans text-xs text-paper-dim">
            {media.length === 0
              ? 'Belum ada aset. Unggah foto pertama lewat tombol Unggah media.'
              : 'Tidak ada aset yang cocok. Longgapkan folder, tujuan, atau pencarian.'}
          </p>
        ) : layout === 'grid' ? (
          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6 2xl:grid-cols-8">
            {visible.map((item) => (
              <article key={item.id} className="flex min-w-0 flex-col rounded border border-hairline bg-bg">
                <div className="flex aspect-square items-center justify-center overflow-hidden rounded-t border-b border-hairline bg-bg-raised-2">
                  {preview !== null && previewName === fileNameOf(item.objectKey) ? (
                    // eslint-disable-next-line @next/next/no-img-element -- signed R2 bytes are already compressed and sized; the optimizer would re-encode them.
                    <img
                      src={preview.url}
                      alt={item.altText ?? fileNameOf(item.objectKey)}
                      className="h-full w-full object-cover"
                      {...preview.headers}
                    />
                  ) : (
                    <span className="flex flex-col items-center gap-1 text-paper-faint">
                      <ImageIcon className="h-4 w-4" aria-hidden="true" />
                      <span className="font-mono text-[10px] tracking-wider">{formatMark(item.mediaType)}</span>
                    </span>
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5 p-1.5">
                  <p className="m-0 truncate font-mono text-[11px] font-medium text-paper" title={fileNameOf(item.objectKey)}>
                    {fileNameOf(item.objectKey)}
                  </p>
                  <p className="m-0 truncate font-mono text-[10px] tabular-nums text-paper-faint">
                    {formatBytes(item.sizeBytes)}
                    {item.widthPx !== null && item.widthPx !== undefined && item.heightPx !== null && item.heightPx !== undefined
                      ? ` · ${item.widthPx}×${item.heightPx}`
                      : ''}
                  </p>
                  <div className="mt-auto flex items-center justify-between gap-1 pt-0.5">
                    <span className="truncate font-sans text-[10px] text-paper-dim" title={ownerLabel(item, model)}>
                      {ownerLabel(item, model)}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      className="h-6 flex-none px-1"
                      disabled={previewBusy || !PREVIEWABLE.has(item.mediaType)}
                      onClick={() => void openPreview(item)}
                    >
                      {previewBusy && previewName === fileNameOf(item.objectKey)
                        ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                        : <ImageIcon className="h-3 w-3" aria-hidden="true" />}
                      <span className="sr-only">Pratinjau {fileNameOf(item.objectKey)}</span>
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-2 min-w-0">
            <Table className="w-full table-fixed text-sm">
              <TableHeader>
                <TableRow className="border-b border-hairline hover:bg-transparent">
                  <TableHead className="px-2 py-2 font-mono text-[11px] font-medium uppercase tracking-wider text-paper-faint">Berkas</TableHead>
                  <TableHead className="px-2 py-2 font-mono text-[11px] font-medium uppercase tracking-wider text-paper-faint">Pemilik</TableHead>
                  <TableHead className="hidden px-2 py-2 font-mono text-[11px] font-medium uppercase tracking-wider text-paper-faint sm:table-cell">Ukuran</TableHead>
                  <TableHead className="px-2 py-2 font-mono text-[11px] font-medium uppercase tracking-wider text-paper-faint">Status</TableHead>
                  <TableHead className="w-12 px-2 py-2 font-mono text-[11px] font-medium uppercase tracking-wider text-paper-faint">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((item) => (
                  <TableRow key={item.id} className="border-b border-hairline/60 hover:bg-bg-raised-2">
                    <TableCell className="min-w-0 px-2 py-1">
                      <p className="m-0 truncate font-mono text-[11px] text-paper" title={fileNameOf(item.objectKey)}>{fileNameOf(item.objectKey)}</p>
                    </TableCell>
                    <TableCell className="min-w-0 truncate px-2 py-1 font-sans text-[11px] text-paper-dim">{ownerLabel(item, model)}</TableCell>
                    <TableCell className="hidden px-2 py-1 font-mono text-[10px] tabular-nums text-paper-dim sm:table-cell">{formatBytes(item.sizeBytes)}</TableCell>
                    <TableCell className="px-2 py-1">
                      <Badge variant="outline" className="font-mono text-[9px] uppercase tracking-wider">
                        {item.state === 'archived' ? <Archive className="h-2.5 w-2.5" aria-hidden="true" /> : null}
                        {STATE_LABELS[item.state] ?? item.state}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-2 py-1 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        className="h-6 px-1"
                        disabled={previewBusy || !PREVIEWABLE.has(item.mediaType)}
                        onClick={() => void openPreview(item)}
                      >
                        {previewBusy && previewName === fileNameOf(item.objectKey)
                          ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                          : <ImageIcon className="h-3 w-3" aria-hidden="true" />}
                        <span className="sr-only">Pratinjau {fileNameOf(item.objectKey)}</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {remaining > 0 ? (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-2">
            <span className="font-mono text-[11px] tabular-nums text-paper-faint">
              {visible.length.toLocaleString('id-ID')} dari {filtered.length.toLocaleString('id-ID')} ditampilkan
            </span>
            <Button type="button" variant="outline" size="sm" onClick={() => setLimit((current) => current + PAGE_SIZE)}>
              <span>Muat {Math.min(remaining, PAGE_SIZE).toLocaleString('id-ID')} lagi</span>
            </Button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
