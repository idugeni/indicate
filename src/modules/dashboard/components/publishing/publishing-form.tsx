'use client';

import { useId, useMemo, useRef, useState, useTransition, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Loader2, Send, Sparkles } from 'lucide-react';
import { SectionCard } from '@/modules/dashboard/components/shared/section-card';
import { EmptyState } from '@/modules/dashboard/components/empty-state';
import { FormNotice } from '@/modules/dashboard/components/shared/form-notice';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchCombobox } from '@/modules/dashboard/components/shared/search-combobox';
import { generateIdempotencyUuid } from '@/modules/dashboard/components/shared/form-utils';
import type { PublicationStatusProjection, PublishingState } from '@/modules/publishing/models';

const STATE_LABELS: Readonly<Record<PublishingState, string>> = {
  queued: 'Antre',
  processing: 'Diproses',
  published: 'Terkirim',
  failed: 'Gagal',
  retrying: 'Diulang',
  unpublished: 'Batal',
};

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
  readonly command: (action: string, payload: unknown) => Promise<unknown>;
}) {
  const model = data as {
    readonly articles?: readonly { readonly id: string; readonly title?: string; readonly slug?: string }[];
    readonly sites?: readonly { readonly id: string; readonly normalizedHostname: string }[];
  } | null;

  const articleSelectId = useId();
  const idempotencyInputId = useId();
  const statusJobInputId = useId();

  const [idempotencyKey, setIdempotencyKey] = useState(generateIdempotencyUuid);
  const [isPublishing, startPublishTransition] = useTransition();
  const [jobStatus, setJobStatus] = useState<PublicationStatusProjection | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [isStatusBusy, startStatusTransition] = useTransition();
  const [suggested, setSuggested] = useState<Readonly<Record<string, { readonly title: string; readonly description: string; readonly imageMediaId: string }>>>({});
  const [selectedSiteIds, setSelectedSiteIds] = useState<readonly string[]>([]);
  const [isSuggesting, startSuggestTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const articleOptions = useMemo(
    () => (model?.articles ?? []).map((item) => ({ value: item.id, label: item.title ? `${item.title}${item.slug ? ` (${item.slug})` : ''}` : (item.slug ?? 'Tanpa judul') })),
    [model?.articles],
  );

  const handleGenerateKey = () => {
    setIdempotencyKey(generateIdempotencyUuid());
  };

  const toggleSite = (siteId: string) => {
    setSelectedSiteIds((prev) => (prev.includes(siteId) ? prev.filter((id) => id !== siteId) : [...prev, siteId]));
  };

  const hostnames = new Map((model?.sites ?? []).map((site) => [site.id, site.normalizedHostname]));

  const refreshStatus = (jobId: string, action: string, payload: unknown) => {
    setStatusError(null);
    startStatusTransition(async () => {
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
    });
  };

  const flipTargetRobots = (articleSiteId: string, directive: 'index' | 'noindex', jobId: string) => {
    const effect = directive === 'noindex' ? 'menyembunyikan kopi ini dari mesin pencari' : 'menampilkan kembali kopi ini di mesin pencari';
    if (!window.confirm(`Ubah indeksasi kopi ini? Tindakan akan ${effect}.`)) return;
    setStatusError(null);
    startStatusTransition(async () => {
      try {
        const result = (await command('publication.setSiteRobots', { articleSiteId, directive })) as { readonly articleSiteId?: string } | null;
        if (result?.articleSiteId === undefined) {
          setStatusError('Perubahan indeksasi tidak dapat disimpan.');
          return;
        }
        toast.success(directive === 'noindex' ? 'Kopi diset noindex.' : 'Kopi diset index.');
        refreshStatus(jobId, 'publication.status', { jobId });
      } catch {
        setStatusError('Perubahan indeksasi tidak dapat disimpan.');
      }
    });
  };

  const handleSuggest = () => {
    const form = formRef.current;
    if (form === null) return;
    const values = new FormData(form);
    const articleId = String(values.get('articleId') ?? '');
    const siteIds = values.getAll('siteIds').map(String);
    if (articleId === '' || siteIds.length === 0) {
      toast.warning('Pilih artikel dan minimal satu situs dulu sebelum membuat varian.');
      return;
    }
    startSuggestTransition(async () => {
      const result = (await command('publication.suggest', { articleId, siteIds })) as {
        readonly overrides?: Readonly<Record<string, { readonly title?: string; readonly description?: string }>>;
      } | null;
      if (result?.overrides === undefined) return;
      const next: Record<string, { title: string; description: string; imageMediaId: string }> = {};
      for (const [siteId, override] of Object.entries(result.overrides)) {
        next[siteId] = { title: override?.title ?? '', description: override?.description ?? '', imageMediaId: '' };
      }
      setSuggested(next);
      toast.info(`Varian unik terisi untuk ${Object.keys(next).length} situs — periksa sebelum kirim.`);
    });
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
      const result = (await command('publication.request', {
        articleId,
        siteIds,
        idempotencyKey: values.get('idempotencyKey'),
        options: { mode: 'immediate' },
        overrides,
      })) as PublicationStatusProjection | null;
      if (result !== null && typeof result === 'object' && 'job' in result && 'targets' in result) {
        setJobStatus(result);
      }
      handleGenerateKey();
    });
  };

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-2">
      <SectionCard icon={Send} title="Terbitkan ke Situs" eyebrow="Penerbitan">

        <form ref={formRef} noValidate onSubmit={handlePublish} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor={articleSelectId} className="font-mono text-xs text-paper-dim">
              Pilih Artikel
            </Label>
            <SearchCombobox
              id={articleSelectId}
              name="articleId"
              disabled={isPublishing}
              defaultValue={model?.articles?.[0]?.id ?? ''}
              placeholder="Pilih artikel"
              options={articleOptions}
              onValueChange={() => setSuggested({})}
            />
          </div>

          <div className="space-y-2">
            <span className="block font-mono text-xs text-paper-dim">
              Situs Tujuan
            </span>
            <div className="max-h-52 divide-y divide-hairline overflow-y-auto border-y border-hairline">
              {model?.sites?.length === 0 ? (
                <EmptyState title="Belum ada situs tujuan." description="Data akan tampil di sini setelah tersedia." />
              ) : (
                model?.sites?.map((item) => (
                  <details key={item.id} className="py-1">
                    <summary className="flex cursor-pointer list-none items-center gap-2.5 py-1.5">
                      <Checkbox
                        id={`publish-site-${item.id}`}
                        checked={selectedSiteIds.includes(item.id)}
                        onCheckedChange={() => toggleSite(item.id)}
                        disabled={isPublishing}
                        aria-label={`Pilih ${item.normalizedHostname}`}
                        className="border-hairline-strong data-checked:border-brass data-checked:bg-brass data-checked:text-bg"
                      />
                      {selectedSiteIds.includes(item.id) ? <input type="hidden" name="siteIds" value={item.id} /> : null}
                      <Label
                        htmlFor={`publish-site-${item.id}`}
                        className="cursor-pointer font-mono text-xs font-normal text-paper"
                      >
                        {item.normalizedHostname}
                      </Label>
                      <span className="font-sans text-[11px] text-paper-faint">varian opsional</span>
                    </summary>
                    <div className="space-y-1.5 py-2 pl-6 pr-1">
                      <Input
                        name={`overrideTitle:${item.id}`}
                        disabled={isPublishing}
                        maxLength={160}
                        value={suggested[item.id]?.title ?? ''}
                        onChange={(e) => setSuggested((prev) => ({ ...prev, [item.id]: { title: e.target.value, description: prev[item.id]?.description ?? '', imageMediaId: prev[item.id]?.imageMediaId ?? '' } }))}
                        placeholder="Judul khusus situs ini (10-160 karakter, unik per situs)"
                        className="h-8 rounded border-hairline-strong bg-bg px-2.5 font-mono text-xs text-paper focus-visible:ring-brass"
                      />
                      <Input
                        name={`overrideDescription:${item.id}`}
                        disabled={isPublishing}
                        maxLength={500}
                        value={suggested[item.id]?.description ?? ''}
                        onChange={(e) => setSuggested((prev) => ({ ...prev, [item.id]: { title: prev[item.id]?.title ?? '', description: e.target.value, imageMediaId: prev[item.id]?.imageMediaId ?? '' } }))}
                        placeholder="Deskripsi khusus situs ini (50-500 karakter, unik per situs)"
                        className="h-8 rounded border-hairline-strong bg-bg px-2.5 font-mono text-xs text-paper focus-visible:ring-brass"
                      />
                      <Input
                        name={`overrideImage:${item.id}`}
                        disabled={isPublishing}
                        value={suggested[item.id]?.imageMediaId ?? ''}
                        onChange={(e) => setSuggested((prev) => ({ ...prev, [item.id]: { title: prev[item.id]?.title ?? '', description: prev[item.id]?.description ?? '', imageMediaId: e.target.value } }))}
                        placeholder="ID gambar khusus situs ini (opsional, lihat halaman Media)"
                        className="h-8 rounded border-hairline-strong bg-bg px-2.5 font-mono text-xs text-paper focus-visible:ring-brass"
                      />
                    </div>
                  </details>
                ))
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor={idempotencyInputId} className="font-mono text-xs text-paper-dim">
                Kunci Pengiriman
              </Label>
              <Button
                type="button"
                variant="link"
                size="xs"
                onClick={handleGenerateKey}
                disabled={isPublishing}
                className="font-mono text-[10px] text-brass"
              >
                Regenerasi Kunci
              </Button>
            </div>
            <Input
              id={idempotencyInputId}
              name="idempotencyKey"
              required
              readOnly
              value={idempotencyKey}
              className="h-8 rounded border-hairline-strong bg-bg px-2.5 font-mono text-xs text-paper-dim focus-visible:ring-brass"
            />
          </div>

          <div className="space-y-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleSuggest}
              disabled={isPublishing || isSuggesting}
              className="w-full"
            >
              {isSuggesting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 text-brass" aria-hidden="true" />
              )}
              <span>Buat Varian Unik Otomatis</span>
            </Button>
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
              <span>Kirim Penerbitan</span>
            </Button>
          </div>
        </form>
      </SectionCard>

      <SectionCard icon={Send} title="Status Pengiriman" eyebrow="Per situs">
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
            <Label htmlFor={statusJobInputId} className="font-mono text-xs text-paper-dim">
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
            </p>
            <div className="divide-y divide-hairline border-y border-hairline">
              {jobStatus.targets.map((target) => (
                <div key={target.id} className="py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-mono text-xs text-paper">{hostnames.get(target.siteId) ?? 'Situs tidak dikenal'}</span>
                    <TargetStateBadge state={target.state} />
                  </div>
                  <p className="m-0 mt-1 font-mono text-[11px] tabular-nums text-paper-faint">
                    {target.attempt}x percobaan
                    {target.publishedUrl !== null ? ` · ${target.publishedUrl}` : ''}
                    {target.sanitizedError !== null ? ` · ${errorCode(target.sanitizedError)}` : ''}
                  </p>
                  {target.state === 'published' ? (
                    <div className="mt-1.5 flex gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isStatusBusy}
                        onClick={() => flipTargetRobots(target.articleSiteId, 'index', jobStatus.job.id)}
                        className="h-6 px-2 font-mono text-[11px]"
                      >
                        Indeks
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isStatusBusy}
                        onClick={() => flipTargetRobots(target.articleSiteId, 'noindex', jobStatus.job.id)}
                        className="h-6 px-2 font-mono text-[11px]"
                      >
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
                disabled={isStatusBusy || !jobStatus.targets.some((target) => target.state === 'failed')}
                onClick={() => refreshStatus(jobStatus.job.id, 'publication.retry', { jobId: jobStatus.job.id })}
                className="flex-1"
              >
                Ulangi yang Gagal
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={isStatusBusy || !jobStatus.targets.some((target) => target.state === 'published')}
                onClick={() => {
                  if (window.confirm('Tarik publikasi yang tayang pada job ini? Konten hilang dari situs target.')) {
                    refreshStatus(jobStatus.job.id, 'publication.unpublish', { jobId: jobStatus.job.id });
                  }
                }}
                className="flex-1"
              >
                Tarik yang Tayang
              </Button>
            </div>
          </div>
        ) : null}
      </SectionCard>
    </div>
  );
}