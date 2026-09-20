'use client';

import { useCallback, useEffect, useId, useState, useTransition, type FormEvent } from 'react';
import { Gauge, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface MediaPolicy {
  readonly allowedMimeTypes: readonly string[];
  readonly maxObjectBytes: number;
  readonly uploadAuthorizationSeconds: number;
  readonly readAuthorizationSeconds: number;
  readonly version: number;
}

const BYTES_PER_MB = 1024 * 1024;

export function MediaPolicySection() {
  const maxMbInputId = useId();
  const uploadTtlInputId = useId();
  const readTtlInputId = useId();

  const [policy, setPolicy] = useState<MediaPolicy | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, startLoadingTransition] = useTransition();
  const [isSaving, startSaveTransition] = useTransition();

  const reload = useCallback(() => {
    startLoadingTransition(async () => {
      setError(null);
      try {
        const response = await fetch('/api/dashboard/runtime-config', { cache: 'no-store' });
        if (response.status === 404) {
          setForbidden(true);
          setPolicy(null);
          return;
        }
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const body = (await response.json()) as { policy: MediaPolicy };
        setPolicy(body.policy);
        setForbidden(false);
      } catch {
        setError('Gagal memuat kebijakan media.');
      }
    });
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => reload());
  }, [reload]);

  const handleSave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (policy === null) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    const maxMb = Number(values.get('maxMb'));
    const uploadTtl = Number(values.get('uploadTtl'));
    const readTtl = Number(values.get('readTtl'));
    if (!Number.isFinite(maxMb) || maxMb <= 0 || !Number.isInteger(uploadTtl) || uploadTtl <= 0 || !Number.isInteger(readTtl) || readTtl <= 0) {
      setError('Nilai harus angka positif; masa berlaku dalam detik bulat.');
      return;
    }
    startSaveTransition(async () => {
      setError(null);
      setNotice(null);
      try {
        const response = await fetch('/api/dashboard/runtime-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'media-policy.save',
            policy: {
              allowedMimeTypes: [...policy.allowedMimeTypes],
              maxObjectBytes: Math.round(maxMb * BYTES_PER_MB),
              uploadAuthorizationSeconds: uploadTtl,
              readAuthorizationSeconds: readTtl,
              version: policy.version,
            },
          }),
        });
        if (response.status === 409) {
          setError('Kebijakan berubah sebelum penyimpanan. Nilai terbaru dimuat ulang.');
          reload();
          return;
        }
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        setNotice('Kebijakan media tersimpan dan tercatat.');
        form.reset();
        reload();
      } catch {
        setError('Penyimpanan gagal. Periksa hak akses platform Anda.');
      }
    });
  };

  if (forbidden) {
    return (
      <section aria-label="Kebijakan media" className="rounded-lg border border-hairline bg-bg-raised p-5 sm:p-6">
        <p className="m-0 font-mono text-xs text-paper-faint">Panel ini membutuhkan izin platform.runtime_config.manage.</p>
      </section>
    );
  }

  return (
    <section aria-label="Kebijakan media" className="rounded-lg border border-hairline bg-bg-raised p-5 sm:p-6">
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-[11px] tabular-nums text-brass">04</span>
        <h3 className="m-0 flex items-center gap-2 font-sans text-sm font-semibold tracking-tight text-paper">
          <Gauge className="h-4 w-4 text-brass" aria-hidden="true" />
          Kebijakan media
        </h3>
        {policy === null ? null : (
          <span className="ml-auto font-mono text-[11px] tabular-nums text-paper-faint">v{policy.version}</span>
        )}
      </div>

      {policy === null ? (
        <p className="m-0 mt-4 font-mono text-xs text-paper-faint">{isLoading ? 'Memuat…' : 'Menunggu data kebijakan.'}</p>
      ) : (
        <form onSubmit={handleSave} className="mt-4 space-y-3.5">
          <p className="m-0 font-mono text-[11px] text-paper-faint">
            Tipe diizinkan: {policy.allowedMimeTypes.join(', ')} · Maks saat ini: {(policy.maxObjectBytes / BYTES_PER_MB).toLocaleString('id-ID', { maximumFractionDigits: 1 })} MB
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label htmlFor={maxMbInputId} className="font-sans text-xs font-medium text-paper-dim">
                Ukuran maks berkas (MB)
              </label>
              <Input
                id={maxMbInputId}
                name="maxMb"
                type="number"
                min={1}
                step="any"
                required
                disabled={isSaving}
                defaultValue={(policy.maxObjectBytes / BYTES_PER_MB).toString()}
                className="h-9 border-hairline-strong bg-bg px-2.5 font-mono text-xs text-paper transition-colors duration-180 hover:border-paper-faint focus-visible:ring-brass"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor={uploadTtlInputId} className="font-sans text-xs font-medium text-paper-dim">
                Masa berlaku tautan unggah (detik)
              </label>
              <Input
                id={uploadTtlInputId}
                name="uploadTtl"
                type="number"
                min={1}
                step={1}
                required
                disabled={isSaving}
                defaultValue={policy.uploadAuthorizationSeconds.toString()}
                className="h-9 border-hairline-strong bg-bg px-2.5 font-mono text-xs text-paper transition-colors duration-180 hover:border-paper-faint focus-visible:ring-brass"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor={readTtlInputId} className="font-sans text-xs font-medium text-paper-dim">
                Masa berlaku tautan baca (detik)
              </label>
              <Input
                id={readTtlInputId}
                name="readTtl"
                type="number"
                min={1}
                step={1}
                required
                disabled={isSaving}
                defaultValue={policy.readAuthorizationSeconds.toString()}
                className="h-9 border-hairline-strong bg-bg px-2.5 font-mono text-xs text-paper transition-colors duration-180 hover:border-paper-faint focus-visible:ring-brass"
              />
            </div>
          </div>

          {notice ? (
            <div className="rounded border border-hairline bg-bg p-2.5 font-mono text-xs text-signal">{notice}</div>
          ) : null}
          {error ? (
            <div className="rounded border border-hairline bg-bg p-2.5 font-mono text-xs text-error">{error}</div>
          ) : null}

          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex h-9 w-full items-center justify-center gap-1.5 bg-brass px-3 font-sans text-xs font-semibold text-bg transition-colors duration-180 hover:bg-brass-soft disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
            <span>Simpan kebijakan media</span>
          </button>
        </form>
      )}
    </section>
  );
}
