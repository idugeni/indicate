'use client';

import { useState } from 'react';
import { Bot, Play, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormNotice } from '@/modules/dashboard/components/shared/form-notice';

type OperatorStep = { readonly id: string; readonly capabilityId: string; readonly arguments: Record<string, unknown> };
type OperatorPlan = { readonly steps: readonly OperatorStep[] };

function errorMessage(value: unknown): string {
  if (typeof value !== 'object' || value === null) return 'Permintaan operator gagal.';
  const row = value as Record<string, unknown>;
  if (typeof row.error === 'string') return row.error;
  if (typeof row.message === 'string') return row.message;
  return 'Permintaan operator gagal.';
}

export function AiOperatorConsole({ organizationId }: { readonly organizationId: string }) {
  const [request, setRequest] = useState('');
  const [plan, setPlan] = useState<OperatorPlan | null>(null);
  const [results, setResults] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(action: 'operator-plan' | 'operator-execute'): Promise<void> {
    setBusy(true);
    setError(null);
    setResults(null);
    try {
      const response = await fetch('/api/dashboard/ai', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          action,
          payload: action === 'operator-plan' ? { request } : { plan },
        }),
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new Error(errorMessage(body));
      if (typeof body !== 'object' || body === null || (body as Record<string, unknown>).ok !== true) {
        throw new Error(errorMessage(body));
      }
      const record = body as Record<string, unknown>;
      if (action === 'operator-plan') {
        const candidate = record.plan as OperatorPlan | undefined;
        if (!candidate || !Array.isArray(candidate.steps)) throw new Error('AI tidak mengembalikan rencana yang valid.');
        setPlan(candidate);
      } else {
        setResults(record.results ?? body);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Permintaan operator gagal.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="rounded-lg border-hairline bg-bg-raised shadow-none">
      <CardHeader className="border-b border-hairline pb-3">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-brass" />
          <CardTitle className="text-sm">AI Operator</CardTitle>
          <span className="rounded border border-hairline px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-paper-dim">Read-only</span>
        </div>
        <CardDescription>Susun rencana AI lalu jalankan hanya kemampuan baca yang sudah memiliki handler. Perubahan data belum diaktifkan.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-paper">Apa yang ingin diperiksa?</span>
          <textarea
            value={request}
            onChange={(event) => setRequest(event.currentTarget.value.slice(0, 1200))}
            maxLength={1200}
            rows={3}
            placeholder="Contoh: ringkas kondisi dashboard dan cari artikel tentang ekonomi"
            className="w-full rounded-md border border-hairline bg-bg px-3 py-2 text-sm text-paper outline-none focus-visible:ring-2 focus-visible:ring-brass"
            disabled={busy}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => void submit('operator-plan')} disabled={busy || request.trim().length < 3}>
            <Bot className="mr-2 h-4 w-4" /> Susun rencana
          </Button>
          <Button type="button" variant="outline" onClick={() => void submit('operator-execute')} disabled={busy || plan === null}>
            <Play className="mr-2 h-4 w-4" /> Jalankan pemeriksaan
          </Button>
        </div>
        <div className="flex items-start gap-2 rounded-md border border-hairline p-3 text-xs leading-5 text-paper-dim">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brass" />
          <p className="m-0">Setiap langkah divalidasi ulang di server. Domain tanpa handler ditolak; aksi tulis, kredensial, billing, dan publikasi belum tersedia.</p>
        </div>
        {error ? <FormNotice tone="error">{error}</FormNotice> : null}
        {plan ? <div className="space-y-2 rounded-md border border-hairline p-3">
          <p className="m-0 text-sm font-medium text-paper">Rencana tervalidasi ({plan.steps.length} langkah)</p>
          <ol className="m-0 list-decimal space-y-1 pl-5 text-xs text-paper-dim">
            {plan.steps.map((step) => <li key={step.id}><code>{step.capabilityId}</code></li>)}
          </ol>
        </div> : null}
        {results !== null ? <pre className="max-h-80 overflow-auto rounded-md border border-hairline bg-bg p-3 text-xs text-paper-dim">{JSON.stringify(results, null, 2)}</pre> : null}
        {busy ? <p role="status" className="m-0 text-xs text-paper-dim">Memproses permintaan…</p> : null}
      </CardContent>
    </Card>
  );
}
