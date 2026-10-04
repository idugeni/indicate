'use client';

import { useId, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  List,
  MessageSquare,
  Search,
  Terminal,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppTooltip } from '@/ui/app-tooltip';

export interface FormatPublishedUrlBlockParams {
  readonly title?: string | null;
  readonly urls: readonly string[];
  readonly includeTitle?: boolean;
}

/**
 * Format teks blok siaran URL publikasi.
 * Menghasilkan baris bernomor terurut yang siap ditempel ke aplikasi pesan.
 */
export function formatPublishedUrlBlock(params: FormatPublishedUrlBlockParams): string {
  const lines = params.urls.map((url, index) => `${index + 1}. ${url}`);
  const heading = params.title?.trim() ?? '';

  if (params.includeTitle && heading !== '') {
    return `${heading}\n\n${lines.join('\n')}`;
  }

  return lines.join('\n');
}

function extractHostname(urlString: string): string {
  try {
    return new URL(urlString).hostname;
  } catch {
    return urlString;
  }
}

export function PublishedUrlBlock({
  title,
  urls,
  organizationId,
}: {
  readonly title: string;
  readonly urls: readonly string[];
  readonly organizationId?: string | undefined;
}) {
  const [isCopied, setIsCopied] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [includeTitle, setIncludeTitle] = useState(true);
  const [viewMode, setViewMode] = useState<'interactive' | 'raw'>('interactive');
  const [filterTerm, setFilterTerm] = useState('');
  const [readiness, setReadiness] = useState<'idle' | 'checking' | 'ready' | 'not-ready' | 'error'>('idle');
  const [readinessReason, setReadinessReason] = useState<string | null>(null);

  const listId = useId();
  const primaryUrl = urls[0] ?? null;
  const shareBlocked = readiness === 'checking' || readiness === 'not-ready';

  const filteredUrls = useMemo(() => {
    const cleanFilter = filterTerm.trim().toLowerCase();
    if (cleanFilter === '') return urls;
    return urls.filter((url) => url.toLowerCase().includes(cleanFilter));
  }, [urls, filterTerm]);

  if (urls.length === 0) return null;

  const handleCopyAll = async () => {
    try {
      const text = formatPublishedUrlBlock({ title, urls, includeTitle });
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      toast.success(
        includeTitle
          ? `${urls.length} URL dan judul disalin untuk siaran WhatsApp.`
          : `${urls.length} URL berhasil disalin tanpa judul.`
      );
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      toast.error('Clipboard browser diblokir. Salin teks langsung dari tampilan.');
    }
  };

  const handleCopySingle = async (url: string, index: number) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedIndex(index);
      toast.success('Tautan berhasil disalin.');
      setTimeout(() => setCopiedIndex(null), 1800);
    } catch {
      toast.error('Gagal menyalin tautan.');
    }
  };

  const handleShareWhatsApp = () => {
    if (shareBlocked) {
      toast.error('Pratinjau belum siap. Cek kesiapan dulu sebelum kirim ke WhatsApp.');
      return;
    }
    const text = formatPublishedUrlBlock({ title, urls, includeTitle: true });
    const encoded = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank', 'noopener,noreferrer');
  };

  const handleCheckReadiness = async () => {
    if (primaryUrl === null || organizationId === undefined || readiness === 'checking') return;
    setReadiness('checking');
    setReadinessReason(null);
    try {
      const response = await fetch(
        `/api/dashboard/share-readiness?organizationId=${encodeURIComponent(organizationId)}&url=${encodeURIComponent(primaryUrl)}`,
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = (await response.json()) as { ready?: boolean; reason?: string };
      if (payload.ready === true) {
        setReadiness('ready');
        setReadinessReason(null);
      } else {
        setReadiness('not-ready');
        setReadinessReason(typeof payload.reason === 'string' ? payload.reason : 'unknown');
      }
    } catch {
      setReadiness('error');
      setReadinessReason(null);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] uppercase tracking-wider text-paper-dim">
            {urls.length.toLocaleString('id-ID')} URL Tayang
          </span>
          <AppTooltip label="Sertakan judul berita di bagian atas teks salinan">
            <button
              type="button"
              onClick={() => setIncludeTitle((prev) => !prev)}
              className={`rounded px-1.5 py-0.5 font-mono text-[10px] transition ${
                includeTitle
                  ? 'border border-brass/40 bg-brass/10 text-brass'
                  : 'border border-hairline bg-bg text-paper-dim'
              }`}
            >
              {includeTitle ? '+ Judul Disertakan' : 'Hanya Tautan'}
            </button>
          </AppTooltip>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="xs"
            aria-expanded={isOpen}
            aria-controls={listId}
            onClick={() => setIsOpen((prev) => !prev)}
            className="h-7 gap-1 font-mono text-xs text-paper-dim hover:text-paper"
          >
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform duration-150 ${
                isOpen ? 'rotate-180 text-brass' : ''
              }`}
              aria-hidden="true"
            />
            <span>{isOpen ? 'Tutup Detail' : 'Buka Detail'}</span>
          </Button>

          <AppTooltip label={shareBlocked ? 'Pratinjau belum siap, cek dulu' : 'Kirim teks siaran ke WhatsApp'}>
            <span className="inline-flex">
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={handleShareWhatsApp}
                disabled={shareBlocked}
                aria-disabled={shareBlocked}
                className="h-7 gap-1.5 border-emerald-500/30 font-sans text-xs text-emerald-400 hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <MessageSquare className="h-3 w-3" aria-hidden="true" />
                <span className="hidden sm:inline">Kirim ke WhatsApp</span>
                <span className="sm:hidden">WA</span>
              </Button>
            </span>
          </AppTooltip>

          {organizationId !== undefined && primaryUrl !== null && (
            <AppTooltip label="Periksa og:image seperti yang dilihat scraper WA/FB">
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => void handleCheckReadiness()}
                disabled={readiness === 'checking'}
                className="h-7 gap-1 font-mono text-xs text-paper-dim hover:text-paper disabled:opacity-50"
              >
                <span>{readiness === 'checking' ? 'Memeriksa…' : readiness === 'ready' ? 'Siap dibagikan' : readiness === 'not-ready' ? 'Belum siap, cek lagi' : readiness === 'error' ? 'Gagal dicek' : 'Cek kesiapan'}</span>
              </Button>
            </AppTooltip>
          )}

          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => void handleCopyAll()}
            className="h-7 gap-1.5 border-hairline-strong font-sans text-xs text-paper hover:border-hairline hover:bg-bg-raised"
          >
            {isCopied ? (
              <Check className="h-3 w-3 text-brass" aria-hidden="true" />
            ) : (
              <Copy className="h-3 w-3 text-paper-dim" aria-hidden="true" />
            )}
            <span>{isCopied ? 'Tersalin' : 'Salin Siaran'}</span>
          </Button>
        </div>
      </div>
      {readiness === 'ready' && (
        <p className="m-0 font-mono text-[11px] text-emerald-400">Pratinjau gambar siap. Aman dibagikan ke WhatsApp.</p>
      )}
      {readiness === 'not-ready' && (
        <p className="m-0 font-mono text-[11px] text-amber-400">
          Pratinjau belum siap ({readinessReason ?? 'unknown'}). Tunggu 1-2 menit lalu cek lagi sebelum share.
        </p>
      )}
      {readiness === 'error' && (
        <p className="m-0 font-mono text-[11px] text-paper-dim">Pemeriksaan gagal. Boleh share, tapi pratinjau berisiko kosong.</p>
      )}
      {readiness === 'idle' && organizationId !== undefined && (
        <p className="m-0 font-mono text-[11px] text-paper-dim">WhatsApp meng-cache pratinjau per URL. Cek kesiapan sebelum share pertama.</p>
      )}

      {isOpen && (
        <div
          id={listId}
          className="flex flex-col gap-2 rounded-md border border-hairline bg-bg p-3 transition-all duration-150"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline/60 pb-2">
            <div className="flex items-center gap-1 rounded bg-bg-raised p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('interactive')}
                className={`inline-flex items-center gap-1 rounded px-2 py-1 font-mono text-[10px] transition ${
                  viewMode === 'interactive'
                    ? 'bg-bg text-brass shadow-xs'
                    : 'text-paper-dim hover:text-paper'
                }`}
              >
                <List className="h-3 w-3" />
                <span>Interaktif</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('raw')}
                className={`inline-flex items-center gap-1 rounded px-2 py-1 font-mono text-[10px] transition ${
                  viewMode === 'raw'
                    ? 'bg-bg text-brass shadow-xs'
                    : 'text-paper-dim hover:text-paper'
                }`}
              >
                <Terminal className="h-3 w-3" />
                <span>Teks Mentah</span>
              </button>
            </div>

            {viewMode === 'interactive' && urls.length > 5 && (
              <div className="relative flex items-center">
                <Search className="pointer-events-none absolute left-2 h-3 w-3 text-paper-dim" />
                <Input
                  value={filterTerm}
                  onChange={(e) => setFilterTerm(e.target.value)}
                  placeholder="Saring portal..."
                  className="h-6 w-36 rounded border-hairline-strong bg-bg pl-7 pr-6 font-mono text-[10px] text-paper placeholder:text-paper-dim/50 hover:border-hairline focus-visible:ring-1 focus-visible:ring-brass"
                />
                {filterTerm !== '' && (
                  <button
                    type="button"
                    onClick={() => setFilterTerm('')}
                    className="absolute right-1.5 rounded text-paper-dim hover:text-paper"
                    aria-label="Bersihkan saringan"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                )}
              </div>
            )}
          </div>

          {viewMode === 'interactive' ? (
            <div className="flex max-h-64 flex-col gap-1 overflow-y-auto pr-1">
              {filteredUrls.length === 0 ? (
                <p className="py-4 text-center font-mono text-xs text-paper-dim">
                  Tidak ada URL yang cocok dengan kata kunci saringan.
                </p>
              ) : (
                filteredUrls.map((url, index) => {
                  const hostname = extractHostname(url);
                  const isCurrentCopied = copiedIndex === index;

                  return (
                    <div
                      key={url}
                      className="group flex items-center justify-between gap-2 rounded border border-hairline/60 bg-bg-raised/40 px-2.5 py-1.5 transition hover:border-hairline hover:bg-bg-raised"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="font-mono text-[10px] tabular-nums text-paper-dim">
                          {(index + 1).toString().padStart(2, '0')}.
                        </span>
                        <div className="flex min-w-0 items-center gap-1.5">
                          <span className="shrink-0 rounded bg-bg px-1.5 py-0.5 font-mono text-[10px] text-paper-dim">
                            {hostname}
                          </span>
                          <span className="truncate font-mono text-[11px] text-paper">
                            {url}
                          </span>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        <AppTooltip label="Salin tautan ini">
                          <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            onClick={() => void handleCopySingle(url, index)}
                            className="h-6 w-6 p-0 text-paper-dim hover:text-paper"
                            aria-label={`Salin tautan ${hostname}`}
                          >
                            {isCurrentCopied ? (
                              <Check className="h-3 w-3 text-emerald-400" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </AppTooltip>
                        <AppTooltip label="Buka URL di tab baru">
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex h-6 w-6 items-center justify-center rounded text-paper-dim hover:bg-bg hover:text-brass"
                            aria-label={`Buka ${hostname} di tab baru`}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </AppTooltip>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <pre
              aria-label={`Daftar teks mentah URL untuk ${title}`}
              className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded border border-hairline/60 bg-bg-raised/30 p-2.5 font-mono text-[11px] leading-relaxed text-paper selection:bg-brass/20"
            >
              <code>{formatPublishedUrlBlock({ title, urls, includeTitle })}</code>
            </pre>
          )}
        </div>
      )}
    </div>
  );
}