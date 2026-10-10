'use client';

import { useMemo, useState, useTransition } from 'react';
import { Activity, ArrowRight, CheckCircle2, Clock3, Loader2, Radio, RefreshCw, Search, Send, ShieldCheck, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { DashboardCommand } from '@/modules/dashboard/command';
import type { PublicationStatusProjection, PublishingState } from '@/modules/publishing/models';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/modules/dashboard/components/empty-state';
import { SectionCard } from '@/modules/dashboard/components/shared/section-card';
import { SearchCombobox } from '@/modules/dashboard/components/shared/search-combobox';
import { generateIdempotencyUuid, localDateTimeToIso } from '@/modules/dashboard/components/shared/form-utils';

type Model = {
  readonly articles?: readonly { readonly id: string; readonly title?: string; readonly slug?: string; readonly status?: string; readonly scheduledAt?: string | null }[];
  readonly sites?: readonly { readonly id: string; readonly normalizedHostname: string }[];
  readonly articleSites?: readonly { readonly articleId: string; readonly siteId: string }[];
};

const STATE_LABELS: Readonly<Record<PublishingState, string>> = {
  queued: 'Antre',
  processing: 'Diproses',
  published: 'Terkirim',
  failed: 'Gagal',
  retrying: 'Diulang',
  unpublished: 'Batal',
};

function StateIcon({ state }: { readonly state: PublishingState }) {
  if (state === 'published') return <CheckCircle2 className="h-3.5 w-3.5 text-signal" aria-hidden="true" />;
  if (state === 'failed') return <XCircle className="h-3.5 w-3.5 text-error" aria-hidden="true" />;
  if (state === 'processing' || state === 'retrying') return <Loader2 className="h-3.5 w-3.5 animate-spin text-warning" aria-hidden="true" />;
  return <Clock3 className="h-3.5 w-3.5 text-paper-faint" aria-hidden="true" />;
}

export function DistributionControlV2({ data, command }: { readonly data: unknown; readonly command: DashboardCommand }) {
  const model = (data ?? {}) as Model;
  const articles = useMemo(() => model.articles ?? [], [model.articles]);
  const sites = useMemo(() => model.sites ?? [], [model.sites]);
  const [articleId, setArticleId] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<readonly string[]>([]);
  const [mode, setMode] = useState<'now' | 'scheduled'>('now');
  const [publishAt, setPublishAt] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState(generateIdempotencyUuid);
  const [status, setStatus] = useState<PublicationStatusProjection | null>(null);
  const [statusJobId, setStatusJobId] = useState('');
  const [busy, startTransition] = useTransition();
  const [statusBusy, startStatusTransition] = useTransition();

  const articleOptions = useMemo(() => articles.map((a) => ({
    value: a.id,
    label: a.title ? `${a.title}${a.slug ? ` · ${a.slug}` : ''}` : (a.slug ?? 'Tanpa judul'),
  })), [articles]);

  const filteredSites = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return sites;
    return sites.filter((site) => site.normalizedHostname.toLowerCase().includes(needle));
  }, [sites, query]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const selectedCount = selected.length;
  const publishedCount = status?.targets.filter((target) => target.state === 'published').length ?? 0;
  const failedCount = status?.targets.filter((target) => target.state === 'failed').length ?? 0;
  const pendingCount = status?.targets.filter((target) => target.state === 'queued' || target.state === 'processing' || target.state === 'retrying').length ?? 0;

  const loadStatus = (jobId: string) => {
    const normalized = jobId.trim();
    if (!normalized) return;
    startStatusTransition(async () => {
      try {
        const result = await command('publication.status', { jobId: normalized });
        if (result && typeof result === 'object' && 'job' in result && 'targets' in result) {
          setStatus(result as PublicationStatusProjection);
          setStatusJobId(normalized);
        } else toast.error('Status pengiriman tidak tersedia.');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Status pengiriman gagal dimuat.');
      }
    });
  };

  const dispatch = () => {
    if (!articleId) return toast.warning('Pilih artikel yang akan didistribusikan.');
    if (selectedCount === 0) return toast.warning('Pilih minimal satu portal tujuan.');
    const iso = mode === 'scheduled' ? localDateTimeToIso(publishAt) : null;
    if (mode === 'scheduled' && iso === null) return toast.warning('Jadwal distribusi belum valid.');
    if (iso && new Date(iso).getTime() <= Date.now()) return toast.warning('Jadwal distribusi harus berada di masa depan.');

    startTransition(async () => {
      try {
        const result = await command('publication.request', {
          articleId,
          siteIds: selected,
          idempotencyKey,
          options: { mode: mode === 'scheduled' ? 'scheduled' : 'immediate' },
          publishAt: iso,
          overrides: {},
        }, { refresh: true });
        if (result && typeof result === 'object' && 'job' in result && 'targets' in result) {
          const next = result as PublicationStatusProjection;
          setStatus(next);
          setStatusJobId(next.job.id);
          toast.success(mode === 'scheduled' ? 'Distribusi berhasil dijadwalkan.' : 'Distribusi dikirim ke jaringan.');
        } else toast.warning('Perintah diterima, tetapi status job belum tersedia.');
        setIdempotencyKey(generateIdempotencyUuid());
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Distribusi gagal dikirim.');
      }
    });
  };

  const assignSelected = () => {
    if (!articleId || selectedCount === 0) return toast.warning('Pilih artikel dan portal terlebih dahulu.');
    startTransition(async () => {
      try {
        await command('article.sites.assign', { articleId, siteIds: selected }, { refresh: true });
        toast.success(`${selectedCount.toLocaleString('id-ID')} portal ditambahkan ke artikel.`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Penyaluran portal gagal disimpan.');
      }
    });
  };

  const retry = () => {
    if (!status) return;
    startStatusTransition(async () => {
      try {
        const result = await command('publication.retry', { jobId: status.job.id });
        if (result && typeof result === 'object' && 'job' in result && 'targets' in result) setStatus(result as PublicationStatusProjection);
        toast.success('Target gagal dikirim ulang.');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Pengiriman ulang gagal.');
      }
    });
  };

  const setRobots = (articleSiteId: string, directive: 'index' | 'noindex') => {
    if (!window.confirm(directive === 'noindex' ? 'Set target ini menjadi noindex?' : 'Set target ini menjadi index?')) return;
    startStatusTransition(async () => {
      try {
        await command('publication.setSiteRobots', { articleSiteId, directive });
        toast.success(directive === 'noindex' ? 'Target diset noindex.' : 'Target diset index.');
        if (status) {
          const result = await command('publication.status', { jobId: status.job.id });
          if (result && typeof result === 'object' && 'job' in result && 'targets' in result) setStatus(result as PublicationStatusProjection);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Perubahan indeksasi gagal.');
      }
    });
  };

  const unpublish = () => {
    if (!status || !window.confirm('Tarik publikasi yang saat ini tayang pada job ini?')) return;
    startStatusTransition(async () => {
      try {
        const result = await command('publication.unpublish', { jobId: status.job.id });
        if (result && typeof result === 'object' && 'job' in result && 'targets' in result) setStatus(result as PublicationStatusProjection);
        toast.success('Permintaan penarikan publikasi dikirim.');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Penarikan publikasi gagal.');
      }
    });
  };

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-hairline bg-bg-raised/60 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="m-0 font-mono text-[10px] uppercase tracking-[0.18em] text-brass">02 / Distribution Control</p>
            <h1 className="m-0 mt-1 text-xl font-semibold tracking-tight text-paper sm:text-2xl">Distribution Control</h1>
            <p className="m-0 mt-1 max-w-2xl text-sm leading-relaxed text-paper-faint">Rancang target jaringan, kirim distribusi, lalu kendalikan hasil per portal dari satu workspace operasional.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:min-w-[360px]">
            <div className="rounded-lg border border-hairline bg-bg px-3 py-2"><span className="block font-mono text-[9px] uppercase text-paper-faint">Terpilih</span><strong className="mt-1 block font-mono text-sm text-paper">{selectedCount}</strong></div>
            <div className="rounded-lg border border-hairline bg-bg px-3 py-2"><span className="block font-mono text-[9px] uppercase text-paper-faint">Terkirim</span><strong className="mt-1 block font-mono text-sm text-signal">{publishedCount}</strong></div>
            <div className="rounded-lg border border-hairline bg-bg px-3 py-2"><span className="block font-mono text-[9px] uppercase text-paper-faint">Gagal</span><strong className="mt-1 block font-mono text-sm text-error">{failedCount}</strong></div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,.8fr)]">
        <SectionCard icon={Send} title="Build Distribution" eyebrow="01 · Rencana pengiriman">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="font-mono text-[11px] uppercase tracking-wider text-paper-dim" htmlFor="distribution-v2-article">Artikel</label>
              <SearchCombobox id="distribution-v2-article" value={articleId} onValueChange={(value) => setArticleId(value ?? '')} options={articleOptions} placeholder="Pilih artikel kanonis" disabled={busy} />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button type="button" variant={mode === 'now' ? 'default' : 'outline'} aria-pressed={mode === 'now'} onClick={() => setMode('now')} disabled={busy}><Radio className="h-3.5 w-3.5" />Terbit sekarang</Button>
              <Button type="button" variant={mode === 'scheduled' ? 'default' : 'outline'} aria-pressed={mode === 'scheduled'} onClick={() => setMode('scheduled')} disabled={busy}><Clock3 className="h-3.5 w-3.5" />Jadwalkan</Button>
            </div>
            {mode === 'scheduled' ? (
              <div className="space-y-1.5">
                <label className="font-mono text-[11px] uppercase tracking-wider text-paper-dim" htmlFor="distribution-v2-schedule">Waktu publish</label>
                <Input id="distribution-v2-schedule" type="datetime-local" value={publishAt} onChange={(event) => setPublishAt(event.target.value)} disabled={busy} />
              </div>
            ) : null}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-[11px] uppercase tracking-wider text-paper-dim">Jaringan target</span>
                <span className="font-mono text-[11px] tabular-nums text-paper-faint">{selectedCount} / {sites.length} portal</span>
              </div>
              <div className="flex gap-2">
                <div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-paper-faint" /><Input className="pl-8" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari hostname" aria-label="Cari portal target" /></div>
                <Button type="button" variant="outline" disabled={busy || filteredSites.length === 0} onClick={() => setSelected(filteredSites.map((site) => site.id))}>Pilih hasil</Button>
                <Button type="button" variant="ghost" disabled={busy || selectedCount === 0} onClick={() => setSelected([])}>Reset</Button>
              </div>
              <div className="max-h-72 overflow-y-auto rounded-lg border border-hairline bg-bg">
                {sites.length === 0 ? <EmptyState title="Belum ada portal tujuan." description="Tidak ada situs produksi yang tersedia untuk distribusi." /> : filteredSites.length === 0 ? <p className="m-0 p-4 text-sm text-paper-faint">Tidak ada portal yang cocok.</p> : filteredSites.map((site) => (
                  <label key={site.id} className="flex cursor-pointer items-center gap-3 border-b border-hairline/60 px-3 py-2.5 last:border-0 hover:bg-bg-raised-2">
                    <Checkbox checked={selectedSet.has(site.id)} onCheckedChange={() => setSelected((prev) => prev.includes(site.id) ? prev.filter((id) => id !== site.id) : [...prev, site.id])} disabled={busy} />
                    <span className="min-w-0 flex-1 truncate font-mono text-xs text-paper">{site.normalizedHostname}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2 rounded-lg border border-hairline bg-bg p-3 sm:flex-row sm:items-center">
              <ShieldCheck className="h-4 w-4 flex-none text-brass" aria-hidden="true" />
              <span className="min-w-0 flex-1 text-xs leading-relaxed text-paper-faint">Idempotency aktif untuk mencegah pengiriman ganda pada retry jaringan.</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => setIdempotencyKey(generateIdempotencyUuid())} disabled={busy}><RefreshCw className="h-3.5 w-3.5" />Regenerasi</Button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button type="button" variant="outline" onClick={assignSelected} disabled={busy || !articleId || selectedCount === 0}>Simpan target artikel</Button>
              <Button type="button" onClick={dispatch} disabled={busy || !articleId || selectedCount === 0}>{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}{mode === 'scheduled' ? 'Jadwalkan distribusi' : 'Kirim distribusi'}</Button>
            </div>
          </div>
        </SectionCard>

        <div className="space-y-5">
          <SectionCard icon={Activity} title="Dispatch Monitor" eyebrow="02 · Status job">
            <div className="flex gap-2">
              <Input value={statusJobId} onChange={(e) => setStatusJobId(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') loadStatus(statusJobId); }} placeholder="ID job distribusi" aria-label="ID job distribusi" />
              <Button type="button" variant="outline" onClick={() => loadStatus(statusJobId)} disabled={statusBusy || !statusJobId.trim()}>{statusBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}Muat</Button>
            </div>
            {status ? (
              <div className="mt-4 space-y-3">
                <div className="rounded-lg border border-hairline bg-bg p-3">
                  <div className="flex items-center justify-between gap-2"><span className="font-mono text-xs text-paper">{/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(status.job.id) ? 'Ringkasan pengiriman' : status.job.id}</span><Badge variant="outline">{STATE_LABELS[status.job.state] ?? status.job.state}</Badge></div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-center"><div><strong className="block font-mono text-sm text-signal">{publishedCount}</strong><span className="font-mono text-[9px] uppercase text-paper-faint">Published</span></div><div><strong className="block font-mono text-sm text-error">{failedCount}</strong><span className="font-mono text-[9px] uppercase text-paper-faint">Failed</span></div><div><strong className="block font-mono text-sm text-warning">{pendingCount}</strong><span className="font-mono text-[9px] uppercase text-paper-faint">Pending</span></div></div>
                </div>
                <div className="max-h-64 divide-y divide-hairline overflow-y-auto rounded-lg border border-hairline">
                  {status.targets.map((target) => <div key={target.id} className="px-3 py-2.5"><div className="flex items-center gap-2"><StateIcon state={target.state} /><span className="min-w-0 flex-1 truncate font-mono text-xs text-paper">{sites.find((site) => site.id === target.siteId)?.normalizedHostname ?? 'Situs tidak tersedia'}</span><span className="font-mono text-[10px] text-paper-faint">{target.attempt}x</span></div>{target.publishedUrl ? <a className="mt-1 block truncate font-mono text-[10px] text-brass hover:underline" href={target.publishedUrl} target="_blank" rel="noreferrer">{target.publishedUrl}</a> : null}
                    {target.state === 'published' ? <div className="mt-1.5 flex gap-1.5"><Button type="button" variant="ghost" size="sm" onClick={() => setRobots(target.articleSiteId, 'index')} disabled={statusBusy}>Index</Button><Button type="button" variant="ghost" size="sm" onClick={() => setRobots(target.articleSiteId, 'noindex')} disabled={statusBusy}>Noindex</Button></div> : null}</div>)}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button type="button" variant="outline" disabled={statusBusy || failedCount === 0} onClick={retry}>Ulangi gagal</Button>
                  <Button type="button" variant="destructive" disabled={statusBusy || publishedCount === 0} onClick={unpublish}>Tarik tayang</Button>
                </div>
              </div>
            ) : <div className="rounded-lg border border-dashed border-hairline p-6 text-center"><Activity className="mx-auto h-5 w-5 text-paper-faint" /><p className="m-0 mt-2 text-sm text-paper-dim">Belum ada job yang dipantau.</p><p className="m-0 mt-1 text-xs text-paper-faint">Kirim distribusi atau masukkan ID job untuk memulai monitoring.</p></div>}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
