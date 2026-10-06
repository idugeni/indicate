'use client';

import { useId, useMemo, useState, useTransition, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Activity, CalendarClock, Loader2, RefreshCw, Send } from 'lucide-react';
import type { DashboardCommand } from '@/modules/dashboard/command';
import { SectionCard } from '@/modules/dashboard/components/shared/section-card';
import { EmptyState } from '@/modules/dashboard/components/empty-state';
import { FormNotice } from '@/modules/dashboard/components/shared/form-notice';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchCombobox } from '@/modules/dashboard/components/shared/search-combobox';
import { generateIdempotencyUuid, isoToLocalDateTimeInput, localDateTimeToIso } from '@/modules/dashboard/components/shared/form-utils';
import { formatMoment } from '@/modules/dashboard/components/shared/format-moment';
import { AppTooltip } from '@/ui/app-tooltip';
import type { PublicationStatusProjection, PublishingState } from '@/modules/publishing/models';

const STATE_LABELS: Readonly<Record<PublishingState, string>> = {
  queued: 'Antre',
  processing: 'Diproses',
  published: 'Terkirim',
  failed: 'Gagal',
  retrying: 'Diulang',
  unpublished: 'Batal',
};

type PublishMode = 'now' | 'scheduled';

/** Target rows rendered per pass; one network carries thousands of portals. */
const SITE_PAGE_SIZE = 40;

function formatScheduleTime(value: string): string {
  return formatMoment(value) ?? value;
}

function TargetStateBadge({ state }: { readonly state: PublishingState }) {
  const tone =
    state === 'published'
      ? 'border-signal/40 text-signal'
      : state === 'failed'
        ? 'border-error/40 text-error'
        : state === 'unpublished'
          ? 'border-hairline-strong text-paper-faint'
          : 'border-warning/40 text-warning';
  return (
    <Badge variant="outline" className={`font-mono text-[10px] uppercase tracking-wider ${tone}`}>
      {STATE_LABELS[state]}
    </Badge>
  );
}

function errorCode(value: Readonly<Record<string, unknown>>): string {
  return typeof value.code === 'string' ? value.code : 'gagal';
}

export function PublishingForm({
  data,
  command,
}: {
  readonly data: unknown;
  readonly command: DashboardCommand;
}) {
  const model = data as {
    readonly articles?: readonly { readonly id: string; readonly title?: string; readonly slug?: string; readonly status?: string; readonly scheduledAt?: string | null }[];
    readonly sites?: readonly { readonly id: string; readonly normalizedHostname: string }[];
  } | null;

  const articleSelectId = useId();
  const publishAtInputId = useId();
  const idempotencyInputId = useId();
  const statusJobInputId = useId();
  const siteQueryId = useId();

  const [idempotencyKey, setIdempotencyKey] = useState(generateIdempotencyUuid);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [scheduleSelection, setScheduleSelection] = useState<{ readonly articleId: string; readonly mode: PublishMode; readonly value: string } | null>(null);
  const [isPublishing, startPublishTransition] = useTransition();
  const [jobStatus, setJobStatus] = useState<PublicationStatusProjection | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [isStatusBusy, startStatusTransition] = useTransition();
  const [isRetryBusy, startRetryTransition] = useTransition();
  const [isUnpublishBusy, startUnpublishTransition] = useTransition();
  /** Baris target yang sedang dibalik indeksasinya; baris lain tetap bisa diklik. */
  const [busyTarget, setBusyTarget] = useState<{ readonly articleSiteId: string; readonly directive: 'index' | 'noindex' } | null>(null);
  const [suggested, setSuggested] = useState<Readonly<Record<string, { readonly title: string; readonly description: string; readonly imageMediaId: string }>>>({});
  const [selectedSiteIds, setSelectedSiteIds] = useState<readonly string[]>([]);
  const [siteQuery, setSiteQuery] = useState('');
  const [expandedSiteIds, setExpandedSiteIds] = useState<readonly string[]>([]);
  const [siteLimit, setSiteLimit] = useState(SITE_PAGE_SIZE);
  const articleOptions = useMemo(
    () => (model?.articles ?? []).map((item) => ({ value: item.id, label: `${item.title ? `${item.title}${item.slug ? ` (${item.slug})` : ''}` : (item.slug ?? 'Tanpa judul')}${item.status === 'scheduled' ? ' · Terjadwal' : ''}` })),
    [model?.articles],
  );
  const effectiveArticleId = selectedArticleId ?? model?.articles?.[0]?.id ?? '';
  const selectedArticle = useMemo(
    () => (model?.articles ?? []).find((item) => item.id === effectiveArticleId) ?? null,
    [model?.articles, effectiveArticleId],
  );
  const storedSchedule = selectedArticle?.status === 'scheduled' ? isoToLocalDateTimeInput(selectedArticle.scheduledAt) : '';
  const activeSchedule = scheduleSelection?.articleId === effectiveArticleId
    ? scheduleSelection
    : { articleId: effectiveArticleId, mode: storedSchedule === '' ? 'now' as const : 'scheduled' as const, value: storedSchedule };
  const publishMode = activeSchedule.mode;
  const publishAt = activeSchedule.value;

  const handleGenerateKey = () => {
    setIdempotencyKey(generateIdempotencyUuid());
  };

  const toggleSite = (siteId: string) => {
    setSelectedSiteIds((prev) => (prev.includes(siteId) ? prev.filter((id) => id !== siteId) : [...prev, siteId]));
  };

  const toggleExpandedSite = (siteId: string) => {
    setExpandedSiteIds((prev) => (prev.includes(siteId) ? prev.filter((id) => id !== siteId) : [...prev, siteId]));
  };

  const matchedSites = useMemo(() => {
    const needle = siteQuery.trim().toLowerCase();
    const sites = model?.sites ?? [];
    if (needle === '') return sites;
    return sites.filter((site) => site.normalizedHostname.toLowerCase().includes(needle));
  }, [model?.sites, siteQuery]);

  const orderedSites = useMemo(() => {
    const selected = new Set(selectedSiteIds);
    return [...matchedSites].sort((a, b) => Number(selected.has(b.id)) - Number(selected.has(a.id)));
  }, [matchedSites, selectedSiteIds]);

  const visibleSites = useMemo(() => orderedSites.slice(0, siteLimit), [orderedSites, siteLimit]);
  const unmatchedSelectedCount = selectedSiteIds.length - matchedSites.filter((site) => selectedSiteIds.includes(site.id)).length;

  const selectMatchedSites = () => {
    setSelectedSiteIds((prev) => [...new Set([...prev, ...matchedSites.map((site) => site.id)])]);
  };

  const hostnames = new Map((model?.sites ?? []).map((site) => [site.id, site.normalizedHostname]));

  const fetchJobStatus = async (jobId: string, action: string, payload: unknown): Promise<void> => {
    setStatusError(null);
    try {
      const result = (await command(action, payload)) as PublicationStatusProjection | null;
      if (result !== null && typeof result === 'object' && 'job' in result && 'targets' in result) {
        setJobStatus(result);
      } else {
        setStatusError('Status pengiriman tidak dapat dimuat.');
      }
    } catch {
      setStatusError('Status publikasi tidak dapat dimuat.');
    }
  };

  /** Muat ulang status untuk tombol Muat; aksinya sendiri yang menampilkan loading. */
  const refreshStatus = (jobId: string, action: string, payload: unknown) => {
    startStatusTransition(() => {
      void fetchJobStatus(jobId, action, payload);
    });
  };

  const flipTargetRobots = (articleSiteId: string, directive: 'index' | 'noindex', jobId: string) => {
    const effect = directive === 'noindex' ? 'menyembunyikan kopi ini dari mesin pencari' : 'menampilkan kembali kopi ini di mesin pencari';
    if (!window.confirm(`Ubah indeksasi kopi ini? Tindakan akan ${effect}.`)) return;
    if (busyTarget?.articleSiteId === articleSiteId) return;
    setStatusError(null);
    setBusyTarget({ articleSiteId, directive });
    void (async () => {
      try {
        const result = (await command('publication.setSiteRobots', { articleSiteId, directive })) as { readonly articleSiteId?: string } | null;
        if (result?.articleSiteId === undefined) {
          setStatusError('Perubahan indeksasi tidak dapat disimpan.');
          return;
        }
        toast.success(directive === 'noindex' ? 'Kopi diset noindex.' : 'Kopi diset index.');
        await fetchJobStatus(jobId, 'publication.status', { jobId });
      } catch {
        setStatusError('Perubahan indeksasi tidak dapat disimpan.');
      } finally {
        setBusyTarget((prev) => (prev?.articleSiteId === articleSiteId ? null : prev));
      }
    })();
  };

  const handleArticleChange = (next: string | null) => {
    setSelectedArticleId(next ?? '');
    setScheduleSelection(null);
    setSuggested({});
  };

  const handlePublish = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const articleId = String(values.get('articleId') ?? '');
    const siteIds = values.getAll('siteIds').map(String);
    if (articleId === '' || siteIds.length === 0) {
      toast.warning('Pilih artikel dan minimal satu situs dulu sebelum menerbitkan.');
      return;
    }
    const normalizedPublishAt = publishMode === 'scheduled' ? localDateTimeToIso(String(values.get('publishAt') ?? '')) : null;
    if (publishMode === 'scheduled' && normalizedPublishAt === null) {
      toast.warning('Pilih tanggal dan waktu publish yang valid.');
      return;
    }
    if (normalizedPublishAt !== null && new Date(normalizedPublishAt).getTime() <= Date.now()) {
      toast.warning('Waktu publish harus berada di masa depan.');
      return;
    }
    const overrides: Record<string, { title?: string; description?: string; imageMediaId?: string }> = {};
    for (const siteId of siteIds) {
      const title = (suggested[siteId]?.title ?? '').trim();
      const description = (suggested[siteId]?.description ?? '').trim();
      const imageMediaId = (suggested[siteId]?.imageMediaId ?? '').trim();
      if (title !== '' || description !== '' || imageMediaId !== '') {
        overrides[siteId] = { ...(title === '' ? {} : { title }), ...(description === '' ? {} : { description }), ...(imageMediaId === '' ? {} : { imageMediaId }) };
      }
    }

    startPublishTransition(async () => {
      try {
        const result = (await command('publication.request', {
          articleId,
          siteIds,
          idempotencyKey: values.get('idempotencyKey'),
          options: { mode: publishMode === 'scheduled' ? 'scheduled' : 'immediate' },
          publishAt: normalizedPublishAt,
          overrides,
        }, { refresh: true })) as PublicationStatusProjection | null;
        if (result !== null && typeof result === 'object' && 'job' in result && 'targets' in result) {
          setJobStatus(result);
          toast.success(
            publishMode === 'scheduled'
              ? `Penerbitan dijadwalkan ke ${siteIds.length} situs.`
              : `Penerbitan dikirim ke ${siteIds.length} situs.`,
          );
        } else {
          toast.warning('Perintah diterima tetapi status penerbitan tidak dapat dimuat. Buka tab status.');
        }
        handleGenerateKey();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Penerbitan gagal dikirim. Coba lagi.');
      }
    });
  };

  const scheduledLabel = jobStatus !== null && jobStatus.job.options?.mode === 'scheduled'
    ? `Dijadwalkan ${formatScheduleTime(jobStatus.job.nextDispatchAt)}`
    : null;

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-2">
      <SectionCard icon={Send} title="Terbitkan ke Situs" eyebrow="Penerbitan">

        <form noValidate onSubmit={handlePublish} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor={articleSelectId} className="font-mono text-xs text-paper-dim">
              Pilih Artikel
            </Label>
            <SearchCombobox
              id={articleSelectId}
              name="articleId"
              value={effectiveArticleId}
              disabled={isPublishing}
              placeholder="Pilih artikel"
              options={articleOptions}
              onValueChange={handleArticleChange}
            />
          </div>

          <div className="space-y-2 rounded border border-hairline bg-bg-raised/50 p-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-paper-dim">Waktu publish</span>
              <span className="font-mono text-[10px] text-paper-faint">Waktu lokal browser → UTC</span>
            </div>
            <div role="group" aria-label="Waktu publish" className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={publishMode === 'now' ? 'default' : 'outline'}
                aria-pressed={publishMode === 'now'}
                disabled={isPublishing}
                onClick={() => setScheduleSelection({ articleId: effectiveArticleId, mode: 'now', value: '' })}
                className="w-full"
              >
                Terbit sekarang
              </Button>
              <Button
                type="button"
                variant={publishMode === 'scheduled' ? 'default' : 'outline'}
                aria-pressed={publishMode === 'scheduled'}
                disabled={isPublishing}
                onClick={() => setScheduleSelection({ articleId: effectiveArticleId, mode: 'scheduled', value: publishAt || storedSchedule })}
                className="w-full"
              >
                Jadwalkan
              </Button>
            </div>
            {publishMode === 'scheduled' ? (
              <div className="space-y-1.5">
                <Label htmlFor={publishAtInputId} className="font-mono text-xs text-paper-dim">Tanggal dan waktu</Label>
                <Input
                  id={publishAtInputId}
                  name="publishAt"
                  type="datetime-local"
                  required
                  value={publishAt}
                  disabled={isPublishing}
                  onChange={(event) => setScheduleSelection({ articleId: effectiveArticleId, mode: publishMode, value: event.target.value })}
                  className="h-8 rounded border-hairline-strong bg-bg px-2.5 font-mono text-xs text-paper focus-visible:ring-brass"
                />
                <p className="m-0 font-sans text-[11px] text-paper-faint">Penerbitan akan diproses pada menit yang dipilih atau setelahnya.</p>
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="block font-mono text-xs text-paper-dim">
                Situs Tujuan
              </span>
              <span className="font-mono text-[11px] tabular-nums text-paper-faint">
                {selectedSiteIds.length.toLocaleString('id-ID')} dipilih dari {matchedSites.length.toLocaleString('id-ID')} cocok / {(model?.sites ?? []).length.toLocaleString('id-ID')} total
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                id={siteQueryId}
                type="search"
                value={siteQuery}
                disabled={isPublishing}
                onChange={(event) => { setSiteQuery(event.target.value); setSiteLimit(SITE_PAGE_SIZE); }}
                placeholder="Cari hostname portal"
                aria-label="Cari situs tujuan"
                className="h-8 min-w-0 flex-1 rounded border-hairline-strong bg-bg px-2.5 font-mono text-xs text-paper focus-visible:ring-brass"
              />
              <Button type="button" variant="outline" size="sm" disabled={isPublishing || matchedSites.length === 0} onClick={selectMatchedSites}>
                Pilih semua yang cocok
              </Button>
              <Button type="button" variant="ghost" size="sm" disabled={isPublishing || selectedSiteIds.length === 0} onClick={() => setSelectedSiteIds([])}>
                Kosongkan
              </Button>
            </div>
            {unmatchedSelectedCount > 0 ? (
              <p className="m-0 font-sans text-[11px] text-paper-faint">
                {unmatchedSelectedCount.toLocaleString('id-ID')} situs terpilih tidak cocok dengan pencarian ini, tetapi tetap terkirim.
              </p>
            ) : null}
            <div>
              {selectedSiteIds.map((siteId) => <input key={siteId} type="hidden" name="siteIds" value={siteId} />)}
            </div>
            <div className="max-h-44 divide-y divide-hairline overflow-y-auto border-y border-hairline">
              {(model?.sites ?? []).length === 0 ? (
                <EmptyState title="Belum ada situs tujuan." description="Data akan tampil di sini setelah tersedia." />
              ) : visibleSites.length === 0 ? (
                <p className="m-0 px-3 py-4 font-sans text-xs text-paper-faint">Tidak ada situs yang cocok dengan "{siteQuery.trim()}".</p>
              ) : (
                visibleSites.map((item) => {
                  const expanded = expandedSiteIds.includes(item.id);
                  return (
                    <div key={item.id} className="py-1">
                      <div className="flex items-center gap-2.5 py-1.5">
                        <Checkbox
                          id={`publish-site-${item.id}`}
                          checked={selectedSiteIds.includes(item.id)}
                          onCheckedChange={() => toggleSite(item.id)}
                          disabled={isPublishing}
                          aria-label={`Pilih ${item.normalizedHostname}`}
                          className="border-hairline-strong data-checked:border-brass data-checked:bg-brass data-checked:text-bg"
                        />
                        <Label
                          htmlFor={`publish-site-${item.id}`}
                          className="min-w-0 flex-1 truncate font-mono text-xs font-normal text-paper"
                        >
                          {item.normalizedHostname}
                        </Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          disabled={isPublishing}
                          aria-expanded={expanded}
                          aria-controls={`publish-overrides-${item.id}`}
                          onClick={() => toggleExpandedSite(item.id)}
                          className="font-mono text-[10px] uppercase tracking-wider text-paper-faint"
                        >
                          <span>{expanded ? 'Tutup' : 'Varian'}</span>
                        </Button>
                      </div>
                      {expanded ? (
                        <div id={`publish-overrides-${item.id}`} className="space-y-1.5 py-2 pl-6 pr-1">
                          <Input
                            disabled={isPublishing}
                            maxLength={160}
                            value={suggested[item.id]?.title ?? ''}
                            onChange={(e) => setSuggested((prev) => ({ ...prev, [item.id]: { title: e.target.value, description: prev[item.id]?.description ?? '', imageMediaId: prev[item.id]?.imageMediaId ?? '' } }))}
                            placeholder="Judul khusus situs ini (opsional, kosong = pakai kanonik)"
                            className="h-8 rounded border-hairline-strong bg-bg px-2.5 font-mono text-xs text-paper focus-visible:ring-brass"
                          />
                          <Input
                            disabled={isPublishing}
                            maxLength={500}
                            value={suggested[item.id]?.description ?? ''}
                            onChange={(e) => setSuggested((prev) => ({ ...prev, [item.id]: { title: prev[item.id]?.title ?? '', description: e.target.value, imageMediaId: prev[item.id]?.imageMediaId ?? '' } }))}
                            placeholder="Deskripsi khusus situs ini (opsional, kosong = pakai kanonik)"
                            className="h-8 rounded border-hairline-strong bg-bg px-2.5 font-mono text-xs text-paper focus-visible:ring-brass"
                          />
                          <Input
                            disabled={isPublishing}
                            value={suggested[item.id]?.imageMediaId ?? ''}
                            onChange={(e) => setSuggested((prev) => ({ ...prev, [item.id]: { title: prev[item.id]?.title ?? '', description: prev[item.id]?.description ?? '', imageMediaId: e.target.value } }))}
                            placeholder="ID gambar khusus situs ini (opsional, lihat halaman Media)"
                            className="h-8 rounded border-hairline-strong bg-bg px-2.5 font-mono text-xs text-paper focus-visible:ring-brass"
                          />
                        </div>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
            {orderedSites.length > visibleSites.length ? (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <span className="font-mono text-[11px] tabular-nums text-paper-faint">
                  {visibleSites.length.toLocaleString('id-ID')} dari {orderedSites.length.toLocaleString('id-ID')} ditampilkan
                </span>
                <Button type="button" variant="outline" size="sm" disabled={isPublishing} onClick={() => setSiteLimit((current) => current + SITE_PAGE_SIZE)}>
                  Muat {Math.min(orderedSites.length - visibleSites.length, SITE_PAGE_SIZE).toLocaleString('id-ID')} lagi
                </Button>
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-2 rounded border border-hairline bg-bg px-2 py-1">
            <Label htmlFor={idempotencyInputId} className="font-mono text-[10px] uppercase tracking-wider text-paper-faint">
              Kunci
            </Label>
            <Input
              id={idempotencyInputId}
              name="idempotencyKey"
              required
              readOnly
              value={idempotencyKey}
              className="h-5 min-w-0 flex-1 border-0 bg-transparent px-0 font-mono text-[10px] tracking-tight text-paper-dim focus-visible:ring-0"
            />
            <AppTooltip label="Regenerasi kunci pengiriman" side="top">
              <Button
                type="button"
                variant="ghost"
                size="xs"
                aria-label="Regenerasi kunci pengiriman"
                onClick={handleGenerateKey}
                disabled={isPublishing}
                className="h-5 flex-none px-1 text-brass"
              >
                <RefreshCw className="h-3 w-3" aria-hidden="true" />
              </Button>
            </AppTooltip>
          </div>

          <div>
            <Button
              type="submit"
              variant="default"
              disabled={isPublishing}
              className="w-full"
            >
              {isPublishing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>{publishMode === 'scheduled' ? 'Jadwalkan Penerbitan' : 'Kirim Penerbitan'}</span>
            </Button>
          </div>
        </form>
      </SectionCard>

      <div className="min-w-0 space-y-4 lg:sticky lg:top-4 lg:self-start">
        <SectionCard icon={CalendarClock} title="Rencana pengiriman" eyebrow="Sebelum kirim">
          <dl className="m-0 divide-y divide-hairline/60">
            {[
              { label: 'Mode', value: publishMode === 'scheduled' ? 'Terjadwal' : 'Terbit sekarang' },
              { label: 'Waktu', value: publishMode === 'scheduled' && publishAt !== '' ? formatScheduleTime(localDateTimeToIso(publishAt) ?? publishAt) : 'Segera setelah dikirim' },
              { label: 'Portal tujuan', value: `${selectedSiteIds.length.toLocaleString('id-ID')} dipilih` },
              { label: 'Override khusus', value: `${Object.values(suggested).filter((entry) => entry.title !== '' || entry.description !== '' || entry.imageMediaId !== '').length.toLocaleString('id-ID')} terisi` },
              { label: 'Artikel', value: selectedArticle?.title ?? selectedArticle?.slug ?? 'Belum dipilih' },
            ].map((row) => (
              <div key={row.label} className="flex items-baseline justify-between gap-3 py-1.5">
                <dt className="font-mono text-[10px] uppercase tracking-wider text-paper-faint">{row.label}</dt>
                <dd className="m-0 min-w-0 truncate text-right font-sans text-xs text-paper">
                  <AppTooltip label={row.value} side="left">
                    <span className="block truncate">{row.value}</span>
                  </AppTooltip>
                </dd>
              </div>
            ))}
          </dl>
          {scheduledLabel !== null ? (
            <p className="m-0 mt-2 font-mono text-[10px] tabular-nums text-brass">{scheduledLabel}</p>
          ) : null}
        </SectionCard>

        <SectionCard icon={Activity} title="Status Pengiriman" eyebrow="Per situs">
        <form
          noValidate
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            const jobId = new FormData(event.currentTarget).get('statusJobId');
            if (typeof jobId === 'string' && jobId.trim() !== '') refreshStatus(jobId.trim(), 'publication.status', { jobId: jobId.trim() });
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor={statusJobInputId} className="font-mono text-[11px] font-medium text-paper-dim">
              ID Pengiriman
            </Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id={statusJobInputId}
                name="statusJobId"
                disabled={isStatusBusy}
                placeholder="ID dari hasil pengiriman"
                className="h-8 min-w-0 flex-1 rounded border-hairline-strong bg-bg px-2.5 font-mono text-xs text-paper focus-visible:ring-brass"
              />
              <Button
                type="submit"
                variant="outline"
                disabled={isStatusBusy}
                className="w-full sm:w-auto"
              >
                {isStatusBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
                <span>Muat</span>
              </Button>
            </div>
          </div>
        </form>

        {statusError !== null ? <FormNotice tone="error">{statusError}</FormNotice> : null}

        {jobStatus !== null ? (
          <div className="mt-3 space-y-3">
            <p className="m-0 font-mono text-xs text-paper-dim">
              Pengiriman <span className="text-paper">{jobStatus.job.id}</span> · {STATE_LABELS[jobStatus.job.state] ?? jobStatus.job.state} · {jobStatus.targets.length} situs
              {scheduledLabel !== null ? <span className="text-brass"> · {scheduledLabel}</span> : null}
            </p>
            <div className="divide-y divide-hairline border-y border-hairline">
              {jobStatus.targets.map((target) => (
                <div key={target.id} className="py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 flex-1 truncate font-mono text-xs text-paper">{hostnames.get(target.siteId) ?? 'Situs tidak dikenal'}</span>
                    <TargetStateBadge state={target.state} />
                  </div>
                  <p className="m-0 mt-1 break-all font-mono text-[11px] tabular-nums text-paper-faint">
                    {target.attempt}x percobaan
                    {target.publishedUrl !== null ? ` · ${target.publishedUrl}` : ''}
                    {target.sanitizedError !== null ? ` · ${errorCode(target.sanitizedError)}` : ''}
                  </p>
                  {target.state === 'published' ? (
                    <div className="mt-1.5 flex gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={busyTarget?.articleSiteId === target.articleSiteId}
                        onClick={() => flipTargetRobots(target.articleSiteId, 'index', jobStatus.job.id)}
                        className="h-6 px-2 font-mono text-[11px]"
                      >
                        {busyTarget?.articleSiteId === target.articleSiteId && busyTarget.directive === 'index' ? (
                          <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                        ) : null}
                        Indeks
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={busyTarget?.articleSiteId === target.articleSiteId}
                        onClick={() => flipTargetRobots(target.articleSiteId, 'noindex', jobStatus.job.id)}
                        className="h-6 px-2 font-mono text-[11px]"
                      >
                        {busyTarget?.articleSiteId === target.articleSiteId && busyTarget.directive === 'noindex' ? (
                          <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                        ) : null}
                        Nonindeks
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isRetryBusy || !jobStatus.targets.some((target) => target.state === 'failed')}
                onClick={() => startRetryTransition(() => {
                  void fetchJobStatus(jobStatus.job.id, 'publication.retry', { jobId: jobStatus.job.id });
                })}
                className="flex-1"
              >
                {isRetryBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
                Ulangi yang Gagal
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={isUnpublishBusy || !jobStatus.targets.some((target) => target.state === 'published')}
                onClick={() => {
                  if (window.confirm('Tarik publikasi yang tayang pada job ini? Konten hilang dari situs target.')) {
                    startUnpublishTransition(() => {
                      void fetchJobStatus(jobStatus.job.id, 'publication.unpublish', { jobId: jobStatus.job.id });
                    });
                  }
                }}
                className="flex-1"
              >
                {isUnpublishBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
                Tarik yang Tayang
              </Button>
            </div>
          </div>
        ) : null}
        </SectionCard>
      </div>
    </div>
  );
}