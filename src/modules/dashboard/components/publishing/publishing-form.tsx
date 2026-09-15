'use client';

import { useId, useRef, useState, useTransition, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Loader2, Send, Sparkles } from 'lucide-react';
import { SectionCard } from '@/modules/dashboard/components/shared/section-card';
import { Input } from '@/components/ui/input';
import { generateIdempotencyUuid } from '@/modules/dashboard/components/shared/form-utils';
import type { PublicationStatusProjection, PublishingState } from '@/modules/publishing/models';

function TargetStateBadge({ state }: { readonly state: PublishingState }) {
  const dot =
    state === 'published'
      ? 'bg-signal'
      : state === 'failed'
        ? 'bg-error'
        : state === 'unpublished'
          ? 'bg-paper-faint'
          : 'bg-warning';
  const text =
    state === 'published'
      ? 'text-signal'
      : state === 'failed'
        ? 'text-error'
        : state === 'unpublished'
          ? 'text-paper-faint'
          : 'text-warning';
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider">
      <span className={`h-1.5 w-1.5 ${dot}`} aria-hidden="true" />
      <span className={text}>{state}</span>
    </span>
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
  const [isSuggesting, startSuggestTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const handleGenerateKey = () => {
    setIdempotencyKey(generateIdempotencyUuid());
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
          setStatusError('Status publikasi tidak dapat dimuat.');
        }
      } catch {
        setStatusError('Status publikasi tidak dapat dimuat.');
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
      toast.warning('Pilih artikel dan minimal satu portal dulu sebelum membuat varian.');
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
      toast.info(`Varian unik terisi untuk ${Object.keys(next).length} portal — periksa sebelum kirim.`);
    });
  };

  const handlePublish = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const siteIds = values.getAll('siteIds').map(String);
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
        articleId: values.get('articleId'),
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
      <SectionCard icon={Send} title="Terbitkan ke kanal" eyebrow="Penerbitan">

        <form ref={formRef} onSubmit={handlePublish} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor={articleSelectId} className="font-mono text-xs text-paper-dim">
              Pilih Artikel
            </label>
            <select
              id={articleSelectId}
              name="articleId"
              disabled={isPublishing}
              onChange={() => setSuggested({})}
              className="h-8 w-full rounded border border-hairline-strong bg-bg px-2 font-mono text-xs text-paper transition-colors duration-180 hover:border-hairline focus:border-brass focus:outline-none"
            >
              {model?.articles?.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title ? `${item.title} (${item.slug ?? item.id})` : item.id}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <span className="block font-mono text-xs text-paper-dim">
              Sasaran Portal Distribusi
            </span>
            <div className="max-h-52 divide-y divide-hairline overflow-y-auto border-y border-hairline">
              {model?.sites?.length === 0 ? (
                <p className="m-0 py-3 font-sans text-xs text-paper-faint">
                  Tidak ada target portal yang tersedia.
                </p>
              ) : (
                model?.sites?.map((item) => (
                  <details key={item.id} className="py-1">
                    <summary className="flex cursor-pointer list-none items-center gap-2.5 py-1.5">
                      <input
                        type="checkbox"
                        name="siteIds"
                        value={item.id}
                        disabled={isPublishing}
                        className="h-3.5 w-3.5 border-hairline bg-bg text-brass accent-brass focus:ring-0"
                      />
                      <span className="font-mono text-xs text-paper">
                        {item.normalizedHostname}
                      </span>
                      <span className="font-sans text-[11px] text-paper-faint">varian opsional</span>
                    </summary>
                    <div className="space-y-1.5 py-2 pl-6 pr-1">
                      <Input
                        name={`overrideTitle:${item.id}`}
                        disabled={isPublishing}
                        maxLength={160}
                        value={suggested[item.id]?.title ?? ''}
                        onChange={(e) => setSuggested((prev) => ({ ...prev, [item.id]: { title: e.target.value, description: prev[item.id]?.description ?? '', imageMediaId: prev[item.id]?.imageMediaId ?? '' } }))}
                        placeholder="Judul khusus portal ini (10-160 karakter, unik per portal)"
                        className="h-8 rounded border-hairline-strong bg-bg px-2.5 font-mono text-xs text-paper focus-visible:ring-brass"
                      />
                      <Input
                        name={`overrideDescription:${item.id}`}
                        disabled={isPublishing}
                        maxLength={500}
                        value={suggested[item.id]?.description ?? ''}
                        onChange={(e) => setSuggested((prev) => ({ ...prev, [item.id]: { title: prev[item.id]?.title ?? '', description: e.target.value, imageMediaId: prev[item.id]?.imageMediaId ?? '' } }))}
                        placeholder="Deskripsi khusus portal ini (50-500 karakter, unik per portal)"
                        className="h-8 rounded border-hairline-strong bg-bg px-2.5 font-mono text-xs text-paper focus-visible:ring-brass"
                      />
                      <Input
                        name={`overrideImage:${item.id}`}
                        disabled={isPublishing}
                        value={suggested[item.id]?.imageMediaId ?? ''}
                        onChange={(e) => setSuggested((prev) => ({ ...prev, [item.id]: { title: prev[item.id]?.title ?? '', description: prev[item.id]?.description ?? '', imageMediaId: e.target.value } }))}
                        placeholder="UUID gambar khusus portal ini (opsional, lihat tab Media)"
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
              <label htmlFor={idempotencyInputId} className="font-mono text-xs text-paper-dim">
                Kunci Idempotensi Transaksi
              </label>
              <button
                type="button"
                onClick={handleGenerateKey}
                disabled={isPublishing}
                className="font-mono text-[10px] text-brass hover:underline focus:outline-none"
              >
                Regenerasi UUID
              </button>
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
            <button
              type="button"
              onClick={handleSuggest}
              disabled={isPublishing || isSuggesting}
              className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded border border-hairline-strong bg-bg px-3.5 font-sans text-xs font-semibold text-paper transition-colors duration-180 hover:border-hairline hover:bg-bg-raised-2 disabled:opacity-50"
            >
              {isSuggesting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 text-brass" aria-hidden="true" />
              )}
              <span>Buat Varian Unik Otomatis</span>
            </button>
            <button
              type="submit"
              disabled={isPublishing}
              className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded bg-brass px-3.5 font-sans text-xs font-semibold text-bg transition-colors duration-180 hover:bg-brass-soft disabled:opacity-50"
            >
              {isPublishing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>Kirim Sinyal Penerbitan</span>
            </button>
          </div>
        </form>
      </SectionCard>

      <SectionCard icon={Send} title="Status target" eyebrow="Per kanal">
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            const jobId = new FormData(event.currentTarget).get('statusJobId');
            if (typeof jobId === 'string' && jobId.trim() !== '') refreshStatus(jobId.trim(), 'publication.status', { jobId: jobId.trim() });
          }}
        >
          <div className="space-y-1.5">
            <label htmlFor={statusJobInputId} className="font-mono text-xs text-paper-dim">
              ID Job Publikasi
            </label>
            <div className="flex gap-2">
              <Input
                id={statusJobInputId}
                name="statusJobId"
                disabled={isStatusBusy}
                placeholder="UUID job dari hasil penerbitan"
                className="h-8 rounded border-hairline-strong bg-bg px-2.5 font-mono text-xs text-paper focus-visible:ring-brass"
              />
              <button
                type="submit"
                disabled={isStatusBusy}
                className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded border border-hairline-strong bg-bg px-3 font-sans text-xs font-semibold text-paper transition-colors duration-180 hover:bg-bg-raised-2 disabled:opacity-50"
              >
                {isStatusBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
                <span>Muat</span>
              </button>
            </div>
          </div>
        </form>

        {statusError !== null ? <p className="m-0 mt-3 font-mono text-xs text-error">{statusError}</p> : null}

        {jobStatus !== null ? (
          <div className="mt-3 space-y-3">
            <p className="m-0 font-mono text-xs text-paper-dim">
              Job <span className="text-paper">{jobStatus.job.id}</span> · {jobStatus.job.state} · {jobStatus.targets.length} target
            </p>
            <div className="divide-y divide-hairline border-y border-hairline">
              {jobStatus.targets.map((target) => (
                <div key={target.id} className="py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-mono text-xs text-paper">{hostnames.get(target.siteId) ?? target.siteId}</span>
                    <TargetStateBadge state={target.state} />
                  </div>
                  <p className="m-0 mt-1 font-mono text-[11px] tabular-nums text-paper-faint">
                    {target.attempt}x percobaan
                    {target.publishedUrl !== null ? ` · ${target.publishedUrl}` : ''}
                    {target.sanitizedError !== null ? ` · ${errorCode(target.sanitizedError)}` : ''}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={isStatusBusy || !jobStatus.targets.some((target) => target.state === 'failed')}
                onClick={() => refreshStatus(jobStatus.job.id, 'publication.retry', { jobId: jobStatus.job.id })}
                className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded border border-hairline-strong bg-bg px-3 font-sans text-xs font-semibold text-paper transition-colors duration-180 hover:bg-bg-raised-2 disabled:opacity-50"
              >
                Ulangi yang Gagal
              </button>
              <button
                type="button"
                disabled={isStatusBusy || !jobStatus.targets.some((target) => target.state === 'published')}
                onClick={() => {
                  if (window.confirm('Tarik publikasi yang tayang pada job ini? Konten hilang dari situs target.')) {
                    refreshStatus(jobStatus.job.id, 'publication.unpublish', { jobId: jobStatus.job.id });
                  }
                }}
                className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded border border-error bg-bg px-3 font-sans text-xs font-semibold text-error transition-colors duration-180 hover:bg-error/10 disabled:opacity-50"
              >
                Tarik yang Tayang
              </button>
            </div>
          </div>
        ) : null}
      </SectionCard>
    </div>
  );
}