'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import {
  Building2,
  Check,
  Copy,
  Eye,
  FileText,
  FolderOpen,
  Globe,
  Grid2x2,
  ImageIcon,
  Layers,
  List,
  Loader2,
  Sparkles,
  UploadCloud,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { DashboardSelect, DashboardSelectItem } from '@/modules/dashboard/components/shared/dashboard-select';
import { AppTooltip } from '@/ui/app-tooltip';
import { AiMediaAnalyze } from '@/modules/ai/components/ai-media-analyze';
import { AiCoverGenerator } from '@/modules/ai/components/ai-cover-generator';
import { uploadEditorImage } from '@/modules/dashboard/components/editorial/editor-image-upload';
import { formatBytes } from '@/modules/publishing/compress-image';

const MediaForm = dynamic(
  () =>
    import('@/modules/dashboard/components/publishing/media-form').then((module) => ({
      default: module.MediaForm,
    })),
  {
    loading: () => (
      <div className="flex items-center gap-2 rounded-lg border border-hairline bg-bg-raised p-4 font-mono text-xs text-paper-dim">
        <Loader2 className="h-4 w-4 animate-spin text-brass" />
        <span>Menyiapkan modul pipeline kompresi media...</span>
      </div>
    ),
  },
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
  readonly organizationId?: string | undefined;
}

interface Folder {
  readonly key: string;
  readonly label: string;
  readonly hint: string;
  readonly icon: typeof Building2;
  readonly count: number;
  readonly bytes: number;
}

interface SignedAssetAuthorization {
  readonly url: string;
  readonly headers: Record<string, string>;
}

const STATE_CONFIG: Readonly<
  Record<
    string,
    {
      readonly label: string;
      readonly className: string;
    }
  >
> = {
  active: {
    label: 'Aktif',
    className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  },
  archived: {
    label: 'Arsip',
    className: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  },
  rejected: {
    label: 'Ditolak',
    className: 'border-rose-500/30 bg-rose-500/10 text-rose-400',
  },
};

const FALLBACK_STATE_CONFIG = {
  label: 'Aktif',
  className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
};

const PREVIEWABLE = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/x-icon',
]);

const PAGE_SIZE = 48;

function fileNameOf(objectKey: string): string {
  const segments = objectKey.split('/').filter((segment) => segment.length > 0);
  return segments[segments.length - 1] ?? objectKey;
}

function formatMark(mediaType: string): string {
  const subtype = mediaType.split('/')[1] ?? '';
  return (subtype.split('+')[0] ?? subtype).toUpperCase().slice(0, 4) || 'ASSET';
}

function ownerLabel(media: LibraryMedia, model: LibraryModel | null): string {
  if (media.owner.kind === 'article') {
    return (
      model?.articles?.find((item) => item.id === media.owner.articleId)?.title ??
      'Artikel Jaringan'
    );
  }
  if (media.owner.kind === 'site') {
    return (
      model?.sites?.find((item) => item.id === media.owner.siteId)?.normalizedHostname ??
      'Portal Situs'
    );
  }
  return 'Aset Organisasi';
}

export function MediaLibrary({ data, command, organizationId }: MediaLibraryProps) {
  const model = data as LibraryModel | null;
  const searchId = useId();
  const purposeId = useId();
  const stateId = useId();

  const [folder, setFolder] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [purpose, setPurpose] = useState('');
  const [state, setState] = useState('');
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');
  const [activePanel, setActivePanel] = useState<'none' | 'upload' | 'ai'>('none');
  const [limit, setLimit] = useState(PAGE_SIZE);

  const [previewCache, setPreviewCache] = useState<Record<string, SignedAssetAuthorization>>({});
  const [loadingMediaId, setLoadingMediaId] = useState<string | null>(null);
  const [inspectedMedia, setInspectedMedia] = useState<LibraryMedia | null>(null);
  const [savingCover, setSavingCover] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  const media = useMemo(() => model?.media ?? [], [model]);
  const purposes = useMemo(() => [...new Set(media.map((item) => item.purpose))].sort(), [media]);

  const folders = useMemo<readonly Folder[]>(() => {
    const group = (kind: MediaOwnerKind) => {
      const rows = media.filter((item) => item.owner.kind === kind);
      return {
        count: rows.length,
        bytes: rows.reduce((total, item) => total + item.sizeBytes, 0),
      };
    };
    const organization = group('organization');
    const article = group('article');
    const site = group('site');
    return [
      {
        key: 'all',
        label: 'Semua Media',
        hint: `${media.length.toLocaleString('id-ID')} berkas`,
        icon: FolderOpen,
        count: media.length,
        bytes: media.reduce((total, item) => total + item.sizeBytes, 0),
      },
      {
        key: 'organization',
        label: 'Organisasi',
        hint: 'Aset master korporasi',
        icon: Building2,
        ...organization,
      },
      {
        key: 'article',
        label: 'Artikel',
        hint: 'Foto dan sampul berita',
        icon: FileText,
        ...article,
      },
      {
        key: 'site',
        label: 'Portal Regional',
        hint: 'Identitas logo dan ikon',
        icon: Globe,
        ...site,
      },
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
  const resetWindow = () => setLimit(PAGE_SIZE);

  const totalBytes = useMemo(
    () => media.reduce((total, item) => total + item.sizeBytes, 0),
    [media],
  );
  const activeCount = useMemo(
    () => media.filter((item) => item.state === 'active').length,
    [media],
  );
  const archivedCount = useMemo(
    () => media.filter((item) => item.state === 'archived').length,
    [media],
  );
  const inspectedAuth = inspectedMedia ? (previewCache[inspectedMedia.id] ?? null) : null;

  const requestAuthorization = async (item: LibraryMedia): Promise<SignedAssetAuthorization | null> => {
    const cached = previewCache[item.id];
    if (cached) {
      return cached;
    }
    setLoadingMediaId(item.id);
    try {
      const authorization = (await command('media.read', { mediaId: item.id })) as {
        readonly url?: string;
        readonly requiredHeaders?: Record<string, string>;
      } | null;

      if (!authorization?.url || !authorization.requiredHeaders) {
        toast.error('Otorisasi berkas tidak dapat dibuat oleh sistem.');
        return null;
      }

      const signed: SignedAssetAuthorization = {
        url: authorization.url,
        headers: authorization.requiredHeaders,
      };

      setPreviewCache((prev) => ({ ...prev, [item.id]: signed }));
      return signed;
    } catch {
      toast.error('Gagal meminta otorisasi baca media.');
      return null;
    } finally {
      setLoadingMediaId(null);
    }
  };

  const handleInspect = async (item: LibraryMedia) => {
    setInspectedMedia(item);
    if (PREVIEWABLE.has(item.mediaType) && !previewCache[item.id]) {
      await requestAuthorization(item);
    }
  };

  const handleCopyObjectKey = (key: string) => {
    void navigator.clipboard.writeText(key);
    setCopiedKey(true);
    toast.success('Kunci objek R2 berhasil disalin.');
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleGeneratedCover = (image: { readonly mimeType: string; readonly base64: string }) => {
    if (savingCover) return;
    setSavingCover(true);
    void (async () => {
      try {
        const bytes = Uint8Array.from(atob(image.base64), (char) => char.charCodeAt(0));
        const file = new File([bytes], `ai-cover-${Date.now()}.png`, { type: image.mimeType });
        await uploadEditorImage(file, { kind: 'organization' }, command, {
          purpose: 'article-cover',
        });
        toast.success('Sampul AI berhasil ditambahkan ke pustaka media.');
      } catch {
        toast.error('Gagal mengunggah dan menyimpan sampul AI.');
      } finally {
        setSavingCover(false);
      }
    })();
  };

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape' && inspectedMedia !== null) {
        setInspectedMedia(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inspectedMedia]);

  return (
    <div className="flex flex-col gap-3">
      <section
        aria-label="Ringkasan pustaka media"
        className="rounded-lg border border-hairline bg-bg-raised p-3.5 transition-shadow duration-150"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="m-0 font-sans text-sm font-semibold tracking-tight text-paper">
              Pustaka Media & Repositori Aset
            </h2>
            <p className="m-0 font-mono text-[11px] tabular-nums text-paper-dim">
              {media.length.toLocaleString('id-ID')} aset · {formatBytes(totalBytes)} · {activeCount.toLocaleString('id-ID')} aktif · {archivedCount.toLocaleString('id-ID')} arsip
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={activePanel === 'ai' ? 'default' : 'outline'}
              onClick={() => setActivePanel((prev) => (prev === 'ai' ? 'none' : 'ai'))}
              className="gap-1.5 font-sans text-xs"
            >
              <Sparkles className="h-3.5 w-3.5 text-brass" />
              <span>Studio AI</span>
            </Button>
            <Button
              type="button"
              size="sm"
              variant={activePanel === 'upload' ? 'default' : 'outline'}
              onClick={() => setActivePanel((prev) => (prev === 'upload' ? 'none' : 'upload'))}
              className="gap-1.5 font-sans text-xs"
            >
              {activePanel === 'upload' ? (
                <X className="h-3.5 w-3.5" />
              ) : (
                <UploadCloud className="h-3.5 w-3.5" />
              )}
              <span>{activePanel === 'upload' ? 'Tutup Formulir' : 'Unggah Aset'}</span>
            </Button>
          </div>
        </div>

        {activePanel === 'upload' && (
          <div className="mt-4 border-t border-hairline pt-4">
            <MediaForm data={data} command={command} />
          </div>
        )}

        {activePanel === 'ai' && (
          <div className="mt-4 flex flex-col gap-3 border-t border-hairline pt-4">
            <div className="rounded-md border border-hairline bg-bg p-3">
              <p className="mb-2 font-mono text-xs uppercase tracking-wider text-paper-dim">
                Analisis Visual AI
              </p>
              <AiMediaAnalyze
                organizationId={organizationId}
                onDraft={(draft) => {
                  toast.info(draft.alt === '' ? `Draf visual: ${draft.title}` : `Alt text: ${draft.alt}`);
                }}
              />
            </div>
            <div className="rounded-md border border-hairline bg-bg p-3">
              <p className="mb-2 font-mono text-xs uppercase tracking-wider text-paper-dim">
                Generator Sampul Berita AI
              </p>
              <AiCoverGenerator
                organizationId={organizationId}
                onImage={(image) => handleGeneratedCover(image)}
              />
            </div>
          </div>
        )}
      </section>

      <section aria-label="Folder repositori" className="flex flex-wrap gap-2">
        {folders.map((entry) => {
          const Icon = entry.icon;
          const selected = folder === entry.key;
          return (
            <button
              key={entry.key}
              type="button"
              onClick={() => {
                setFolder(entry.key);
                resetWindow();
              }}
              aria-pressed={selected}
              className={`flex items-center gap-2 rounded-md border px-3 py-2 text-left transition duration-150 ${
                selected
                  ? 'border-brass/70 bg-bg-raised-2 shadow-xs'
                  : 'border-hairline bg-bg-raised hover:border-hairline-strong hover:bg-bg-raised-2'
              }`}
            >
              <Icon
                className={`h-4 w-4 shrink-0 ${selected ? 'text-brass' : 'text-paper-dim'}`}
                aria-hidden="true"
              />
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-sans text-xs font-medium text-paper">{entry.label}</span>
                  <span className="rounded bg-bg px-1 font-mono text-[10px] tabular-nums text-paper-dim">
                    {entry.count.toLocaleString('id-ID')}
                  </span>
                </div>
                <span className="font-mono text-[10px] text-paper-dim/80">{formatBytes(entry.bytes)}</span>
              </div>
            </button>
          );
        })}
      </section>

      <section
        aria-label="Filter dan daftar aset media"
        className="rounded-lg border border-hairline bg-bg-raised p-3.5"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_180px_160px_auto] lg:items-end">
          <div className="space-y-1.5">
            <Label
              htmlFor={searchId}
              className="font-mono text-xs uppercase tracking-wider text-paper-dim"
            >
              Cari Berkas
            </Label>
            <div className="relative flex items-center">
              <Input
                id={searchId}
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  resetWindow();
                }}
                placeholder="Nama berkas, teks alt, atau label pemilik..."
                className="h-9 rounded-md border-hairline-strong bg-bg px-3 font-mono text-xs text-paper placeholder:font-sans placeholder:text-paper-dim/50 hover:border-hairline focus-visible:ring-1 focus-visible:ring-brass"
              />
              {search !== '' && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    resetWindow();
                  }}
                  className="absolute right-2.5 rounded p-0.5 text-paper-dim hover:text-paper"
                  aria-label="Hapus kata kunci pencarian"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor={purposeId}
              className="font-mono text-xs uppercase tracking-wider text-paper-dim"
            >
              Tujuan Penggunaan
            </Label>
            <DashboardSelect
              id={purposeId}
              value={purpose}
              onValueChange={(next) => {
                setPurpose(next ?? '');
                resetWindow();
              }}
              placeholder="Semua tujuan"
            >
              <DashboardSelectItem value="">Semua tujuan</DashboardSelectItem>
              {purposes.map((item) => (
                <DashboardSelectItem key={item} value={item}>
                  {item}
                </DashboardSelectItem>
              ))}
            </DashboardSelect>
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor={stateId}
              className="font-mono text-xs uppercase tracking-wider text-paper-dim"
            >
              Status Siklus
            </Label>
            <DashboardSelect
              id={stateId}
              value={state}
              onValueChange={(next) => {
                setState(next ?? '');
                resetWindow();
              }}
              placeholder="Semua status"
            >
              <DashboardSelectItem value="">Semua status</DashboardSelectItem>
              {Object.entries(STATE_CONFIG).map(([value, conf]) => (
                <DashboardSelectItem key={value} value={value}>
                  {conf.label}
                </DashboardSelectItem>
              ))}
            </DashboardSelect>
          </div>

          <div className="flex items-center justify-end">
            <ToggleGroup
              variant="outline"
              size="sm"
              value={[layout]}
              onValueChange={(values) => {
                const next = values[values.length - 1];
                if (next === 'grid' || next === 'list') setLayout(next);
              }}
              aria-label="Pilih tata letak tampilan"
              className="h-9"
            >
              <ToggleGroupItem
                value="grid"
                aria-label="Tampilan kisi"
                className="data-[state=on]:border-brass data-[state=on]:bg-brass/10 data-[state=on]:text-brass"
              >
                <Grid2x2 className="h-4 w-4" aria-hidden="true" />
              </ToggleGroupItem>
              <ToggleGroupItem
                value="list"
                aria-label="Tampilan daftar"
                className="data-[state=on]:border-brass data-[state=on]:bg-brass/10 data-[state=on]:text-brass"
              >
                <List className="h-4 w-4" aria-hidden="true" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-hairline/60 pt-2.5">
          <p
            role="status"
            aria-live="polite"
            className="m-0 font-mono text-[11px] tabular-nums text-paper-dim"
          >
            Menampilkan {visible.length.toLocaleString('id-ID')} dari {filtered.length.toLocaleString('id-ID')} aset dalam filter
          </p>
          {(search !== '' || purpose !== '' || state !== '' || folder !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setPurpose('');
                setState('');
                setFolder('all');
                resetWindow();
              }}
              className="font-mono text-[11px] text-brass hover:underline"
            >
              Reset semua filter
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="mt-3 flex flex-col items-center justify-center rounded-md border border-dashed border-hairline bg-bg p-8 text-center">
            <Layers className="h-8 w-8 text-paper-dim/40" />
            <p className="mt-2 font-sans text-xs font-medium text-paper">
              {media.length === 0
                ? 'Belum ada aset dalam pustaka'
                : 'Tidak ada media yang cocok dengan filter'}
            </p>
            <p className="mt-0.5 font-sans text-[11px] text-paper-dim">
              {media.length === 0
                ? 'Mulai unggah berkas pertama menggunakan tombol Unggah Aset di atas.'
                : 'Ubah kata kunci pencarian atau bersihkan filter folder dan status.'}
            </p>
          </div>
        ) : layout === 'grid' ? (
          <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
            {visible.map((item) => {
              const fileName = fileNameOf(item.objectKey);
              const auth = previewCache[item.id];
              const isLoadingThis = loadingMediaId === item.id;
              const status = STATE_CONFIG[item.state] ?? STATE_CONFIG.active ?? FALLBACK_STATE_CONFIG;

              return (
                <article
                  key={item.id}
                  onClick={() => void handleInspect(item)}
                  className="group relative flex cursor-pointer flex-col overflow-hidden rounded-md border border-hairline bg-bg transition duration-150 hover:border-hairline-strong hover:shadow-sm"
                >
                  <div className="relative flex aspect-square items-center justify-center overflow-hidden border-b border-hairline bg-bg-raised-2">
                    {auth ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={auth.url}
                        alt={item.altText ?? fileName}
                        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                        {...auth.headers}
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-1.5 p-2 text-center text-paper-dim">
                        {isLoadingThis ? (
                          <Loader2 className="h-5 w-5 animate-spin text-brass" />
                        ) : (
                          <ImageIcon className="h-5 w-5 text-paper-dim/60" />
                        )}
                        <span className="rounded bg-bg px-1 font-mono text-[9px] uppercase tracking-wider text-paper-dim">
                          {formatMark(item.mediaType)}
                        </span>
                      </div>
                    )}

                    <div className="absolute top-1.5 right-1.5">
                      <span
                        className={`rounded px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </div>

                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 backdrop-blur-[1px] transition-opacity duration-150 group-hover:opacity-100">
                      <div className="flex items-center gap-1 rounded bg-bg/90 px-2 py-1 font-mono text-[10px] text-paper">
                        <Eye className="h-3 w-3 text-brass" />
                        <span>Detail</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col gap-0.5 p-2">
                    <AppTooltip label={fileName} side="top">
                      <p className="m-0 truncate font-mono text-[11px] font-medium text-paper">
                        {fileName}
                      </p>
                    </AppTooltip>
                    <p className="m-0 font-mono text-[10px] tabular-nums text-paper-dim">
                      {formatBytes(item.sizeBytes)}
                      {item.widthPx && item.heightPx ? ` · ${item.widthPx}×${item.heightPx}` : ''}
                    </p>
                    <p className="m-0 truncate font-sans text-[10px] text-paper-dim/70">
                      {ownerLabel(item, model)}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mt-3 overflow-hidden rounded-md border border-hairline">
            <Table className="w-full table-fixed text-xs">
              <TableHeader className="bg-bg-raised-2">
                <TableRow className="border-b border-hairline hover:bg-transparent">
                  <TableHead className="w-[36%] px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-paper-dim">
                    Nama Berkas
                  </TableHead>
                  <TableHead className="w-[24%] px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-paper-dim">
                    Pemilik
                  </TableHead>
                  <TableHead className="hidden w-[14%] px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-paper-dim sm:table-cell">
                    Format & Ukuran
                  </TableHead>
                  <TableHead className="w-[14%] px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-paper-dim">
                    Status
                  </TableHead>
                  <TableHead className="w-[12%] px-3 py-2 text-right font-mono text-[11px] uppercase tracking-wider text-paper-dim">
                    Aksi
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((item) => {
                  const fileName = fileNameOf(item.objectKey);
                  const status = STATE_CONFIG[item.state] ?? STATE_CONFIG.active ?? FALLBACK_STATE_CONFIG;
                  const auth = previewCache[item.id];
                  const isLoadingThis = loadingMediaId === item.id;

                  return (
                    <TableRow
                      key={item.id}
                      onClick={() => void handleInspect(item)}
                      className="cursor-pointer border-b border-hairline/60 transition-colors hover:bg-bg-raised-2"
                    >
                      <TableCell className="min-w-0 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded border border-hairline bg-bg">
                            {auth ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={auth.url}
                                alt={fileName}
                                className="h-full w-full object-cover"
                                {...auth.headers}
                              />
                            ) : isLoadingThis ? (
                              <Loader2 className="h-3 w-3 animate-spin text-brass" />
                            ) : (
                              <span className="font-mono text-[9px] uppercase text-paper-dim">
                                {formatMark(item.mediaType)}
                              </span>
                            )}
                          </div>
                          <span className="truncate font-mono text-xs text-paper">{fileName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="truncate px-3 py-2 font-sans text-xs text-paper-dim">
                        {ownerLabel(item, model)}
                      </TableCell>
                      <TableCell className="hidden px-3 py-2 font-mono text-[11px] tabular-nums text-paper-dim sm:table-cell">
                        {formatBytes(item.sizeBytes)}
                        {item.widthPx && item.heightPx ? ` · ${item.widthPx}×${item.heightPx}` : ''}
                      </TableCell>
                      <TableCell className="px-3 py-2">
                        <span
                          className={`inline-flex rounded px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </TableCell>
                      <TableCell className="px-3 py-2 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          className="h-7 px-2 font-mono text-[10px]"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleInspect(item);
                          }}
                        >
                          <Eye className="mr-1 h-3 w-3 text-brass" />
                          <span>Buka</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {remaining > 0 && (
          <div className="mt-3 flex items-center justify-between border-t border-hairline pt-3">
            <span className="font-mono text-[11px] tabular-nums text-paper-dim">
              Sisa {remaining.toLocaleString('id-ID')} berkas belum dimuat
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setLimit((curr) => curr + PAGE_SIZE)}
              className="font-sans text-xs"
            >
              Muat {Math.min(remaining, PAGE_SIZE).toLocaleString('id-ID')} lagi
            </Button>
          </div>
        )}
      </section>

      {inspectedMedia && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="inspect-media-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
          onClick={() => setInspectedMedia(null)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-hairline bg-bg shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
              <div className="min-w-0 pr-3">
                <h3
                  id="inspect-media-title"
                  className="truncate font-mono text-xs font-semibold text-paper"
                >
                  {fileNameOf(inspectedMedia.objectKey)}
                </h3>
                <p className="m-0 font-sans text-[11px] text-paper-dim">
                  Metadata dan inspeksi aset Cloudflare R2
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectedMedia(null)}
                className="rounded p-1 text-paper-dim hover:bg-bg-raised hover:text-paper"
                aria-label="Tutup inspeksi"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex aspect-video w-full items-center justify-center overflow-hidden rounded-md border border-hairline bg-bg-raised-2">
                {inspectedAuth ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={inspectedAuth.url}
                    alt={inspectedMedia.altText ?? fileNameOf(inspectedMedia.objectKey)}
                    className="max-h-full max-w-full object-contain"
                    {...inspectedAuth.headers}
                  />
                ) : loadingMediaId === inspectedMedia.id ? (
                  <div className="flex flex-col items-center gap-2 text-paper-dim">
                    <Loader2 className="h-6 w-6 animate-spin text-brass" />
                    <span className="font-mono text-xs">Meminta otorisasi baca...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-paper-dim">
                    <ImageIcon className="h-8 w-8 text-paper-dim/40" />
                    <span className="font-mono text-xs">
                      {PREVIEWABLE.has(inspectedMedia.mediaType)
                        ? 'Klik tombol di bawah untuk meminta pratinjau'
                        : 'Format berkas tidak mendukung pratinjau inline'}
                    </span>
                    {PREVIEWABLE.has(inspectedMedia.mediaType) && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void requestAuthorization(inspectedMedia)}
                        className="mt-1"
                      >
                        Otorisasi Pratinjau
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div className="rounded border border-hairline bg-bg-raised p-2.5">
                  <span className="font-mono text-[10px] uppercase text-paper-dim">Tipe MIME</span>
                  <p className="mt-1 font-mono text-paper">{inspectedMedia.mediaType}</p>
                </div>
                <div className="rounded border border-hairline bg-bg-raised p-2.5">
                  <span className="font-mono text-[10px] uppercase text-paper-dim">Ukuran Berkas</span>
                  <p className="mt-1 font-mono text-paper">{formatBytes(inspectedMedia.sizeBytes)}</p>
                </div>
                <div className="rounded border border-hairline bg-bg-raised p-2.5">
                  <span className="font-mono text-[10px] uppercase text-paper-dim">Dimensi Piksel</span>
                  <p className="mt-1 font-mono text-paper">
                    {inspectedMedia.widthPx && inspectedMedia.heightPx
                      ? `${inspectedMedia.widthPx} × ${inspectedMedia.heightPx} px`
                      : 'Tidak tertera'}
                  </p>
                </div>
                <div className="rounded border border-hairline bg-bg-raised p-2.5">
                  <span className="font-mono text-[10px] uppercase text-paper-dim">Tujuan Penggunaan</span>
                  <p className="mt-1 font-mono text-paper">{inspectedMedia.purpose}</p>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                <div className="rounded border border-hairline bg-bg-raised p-2.5">
                  <span className="font-mono text-[10px] uppercase text-paper-dim">Pemilik Terhubung</span>
                  <p className="mt-1 font-sans text-xs text-paper">
                    {ownerLabel(inspectedMedia, model)} ({inspectedMedia.owner.kind})
                  </p>
                </div>

                <div className="rounded border border-hairline bg-bg-raised p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase text-paper-dim">Object Key (R2 Storage)</span>
                    <button
                      type="button"
                      onClick={() => handleCopyObjectKey(inspectedMedia.objectKey)}
                      className="inline-flex items-center gap-1 font-mono text-[10px] text-brass hover:underline"
                    >
                      {copiedKey ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      <span>{copiedKey ? 'Tersalin' : 'Salin Kunci'}</span>
                    </button>
                  </div>
                  <p className="mt-1 break-all font-mono text-[11px] text-paper">
                    {inspectedMedia.objectKey}
                  </p>
                </div>

                {inspectedMedia.altText && (
                  <div className="rounded border border-hairline bg-bg-raised p-2.5">
                    <span className="font-mono text-[10px] uppercase text-paper-dim">Alt Text Aksesibilitas</span>
                    <p className="mt-1 font-sans text-xs text-paper">{inspectedMedia.altText}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-hairline bg-bg-raised px-4 py-2.5">
              <span className="font-mono text-[10px] text-paper-dim">
                ID: {inspectedMedia.id}
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setInspectedMedia(null)}
                className="font-sans text-xs"
              >
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}