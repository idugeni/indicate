'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bot, Check, Play, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormNotice } from '@/modules/dashboard/components/shared/form-notice';

type OperatorStep = { readonly id: string; readonly capabilityId: string; readonly arguments: Record<string, unknown> };
type OperatorPlan = { readonly steps: readonly OperatorStep[] };
type ApprovalRecord = { readonly id: string; readonly toolId: string; readonly input: Record<string, unknown>; readonly state: string; readonly expiresAt: string; readonly isRequester: boolean; };

function errorMessage(value: unknown): string {
  if (typeof value !== 'object' || value === null) return 'Permintaan operator gagal.';
  const row = value as Record<string, unknown>;
  if (typeof row.error === 'string') return row.error;
  if (typeof row.message === 'string') return row.message;
  const nested = typeof row.error === 'object' && row.error !== null ? row.error as Record<string, unknown> : null;
  if (nested !== null && typeof nested.message === 'string') return nested.message;
  const envelope = nested !== null && typeof nested.error === 'object' && nested.error !== null ? nested.error as Record<string, unknown> : null;
  if (envelope !== null && typeof envelope.message === 'string') return envelope.message;
  return 'Permintaan operator gagal.';
}

const DISPLAY_UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function approvalInputForDisplay(input: unknown): string {
  return JSON.stringify(
    input,
    (_key, value: unknown) =>
      typeof value === 'string' && DISPLAY_UUID_PATTERN.test(value) ? '[referensi internal]' : value,
    2,
  );
}

export function AiOperatorConsole({ organizationId }: { readonly organizationId: string }) {
  const [request, setRequest] = useState('');
  const [plan, setPlan] = useState<OperatorPlan | null>(null);
  const [results, setResults] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approvals, setApprovals] = useState<readonly ApprovalRecord[]>([]);
  const [canReview, setCanReview] = useState(false);
  const [canRequest, setCanRequest] = useState(false);
  const [canRequestArticleUpdate, setCanRequestArticleUpdate] = useState(false);
  const [canRequestArticleCreate, setCanRequestArticleCreate] = useState(false);
  const [articleId, setArticleId] = useState('');
  const [siteIds, setSiteIds] = useState('');
  const [updateArticleId, setUpdateArticleId] = useState('');
  const [expectedVersion, setExpectedVersion] = useState('');
  const [updateTitle, setUpdateTitle] = useState('');
  const [updateBody, setUpdateBody] = useState('');
  const [updateStatus, setUpdateStatus] = useState('');
  const [createTitle, setCreateTitle] = useState('');
  const [createSlug, setCreateSlug] = useState('');
  const [createRegionId, setCreateRegionId] = useState('');
  const [createBody, setCreateBody] = useState('');
  const [approvalBusy, setApprovalBusy] = useState(true);
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const [approvalNotice, setApprovalNotice] = useState<string | null>(null);

  const refreshApprovals = useCallback(async (): Promise<void> => {
    setApprovalBusy(true); setApprovalError(null);
    try {
      const response = await fetch('/api/dashboard/operator/approvals?organizationId=' + encodeURIComponent(organizationId), { cache: 'no-store' });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok || typeof body !== 'object' || body === null) throw new Error(errorMessage(body));
      const record = body as Record<string, unknown>;
      if (!Array.isArray(record.approvals)) throw new Error('Respons daftar persetujuan tidak valid.');
      setApprovals(record.approvals.filter((item): item is ApprovalRecord => typeof item === 'object' && item !== null && typeof (item as Record<string, unknown>).id === 'string') as ApprovalRecord[]);
      setCanReview(record.canReview === true);
      setCanRequest(record.canRequest === true);
      setCanRequestArticleUpdate(record.canRequestArticleUpdate === true);
      setCanRequestArticleCreate(record.canRequestArticleCreate === true);
    } catch (cause) { setApprovalError(cause instanceof Error ? cause.message : 'Daftar persetujuan gagal dimuat.'); }
    finally { setApprovalBusy(false); }
  }, [organizationId]);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) void refreshApprovals();
    });
    return () => { cancelled = true; };
  }, [refreshApprovals]);

  async function requestPublicationApproval(): Promise<void> {
    setApprovalBusy(true); setApprovalError(null); setApprovalNotice(null);
    try {
      const input = { articleId: articleId.trim(), siteIds: siteIds.split(/[\n,;]+/).map((value) => value.trim()).filter(Boolean), idempotencyKey: globalThis.crypto.randomUUID(), options: {}, overrides: {} };
      const response = await fetch('/api/dashboard/operator/approvals', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ organizationId, action: 'request', toolId: 'publishing.delivery.request', input, idempotencyKey: input.idempotencyKey }) });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new Error(errorMessage(body));
      setApprovalNotice('Permintaan publikasi dikirim untuk persetujuan.');
      await refreshApprovals();
    } catch (cause) { setApprovalError(cause instanceof Error ? cause.message : 'Permintaan persetujuan gagal dibuat.'); }
    finally { setApprovalBusy(false); }
  }

  async function requestArticleCreateApproval(): Promise<void> {
    setApprovalBusy(true); setApprovalError(null); setApprovalNotice(null);
    try {
      const input: Record<string, unknown> = {
        regionId: createRegionId.trim() === '' ? null : createRegionId.trim(),
        slug: createSlug.trim(),
        title: createTitle.trim(),
        body: createBody.trim(),
        status: 'draft',
      };
      const response = await fetch('/api/dashboard/operator/approvals', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ organizationId, action: 'request', toolId: 'content.articles.create', input, idempotencyKey: globalThis.crypto.randomUUID() }),
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new Error(errorMessage(body));
      setApprovalNotice('Permintaan pembuatan artikel dikirim untuk persetujuan.');
      await refreshApprovals();
    } catch (cause) { setApprovalError(cause instanceof Error ? cause.message : 'Permintaan pembuatan artikel gagal dibuat.'); }
    finally { setApprovalBusy(false); }
  }

  async function requestArticleUpdateApproval(): Promise<void> {
    setApprovalBusy(true); setApprovalError(null); setApprovalNotice(null);
    try {
      const input: Record<string, unknown> = { articleId: updateArticleId.trim(), expectedVersion: Number(expectedVersion) };
      if (updateTitle.trim() !== '') input.title = updateTitle.trim();
      if (updateBody.trim() !== '') input.body = updateBody.trim();
      if (updateStatus !== '') input.status = updateStatus;
      const response = await fetch('/api/dashboard/operator/approvals', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ organizationId, action: 'request', toolId: 'content.articles.update', input, idempotencyKey: globalThis.crypto.randomUUID() }),
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new Error(errorMessage(body));
      setApprovalNotice('Permintaan perubahan artikel dikirim untuk persetujuan.');
      await refreshApprovals();
    } catch (cause) { setApprovalError(cause instanceof Error ? cause.message : 'Permintaan perubahan artikel gagal dibuat.'); }
    finally { setApprovalBusy(false); }
  }

  async function executeApproved(approval: ApprovalRecord): Promise<void> {
    setApprovalBusy(true); setApprovalError(null); setApprovalNotice(null);
    try {
      const response = await fetch('/api/dashboard/operator', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ organizationId, toolId: approval.toolId, input: approval.input, approvalId: approval.id }) });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new Error(errorMessage(body));
      setApprovalNotice('Permintaan publikasi diterima oleh executor.');
      setResults(body);
      await refreshApprovals();
    } catch (cause) { setApprovalError(cause instanceof Error ? cause.message : 'Eksekusi publikasi gagal.'); }
    finally { setApprovalBusy(false); }
  }

  async function decideApproval(approvalId: string, decision: 'approved' | 'rejected'): Promise<void> {
    setApprovalBusy(true); setApprovalError(null); setApprovalNotice(null);
    try {
      const response = await fetch('/api/dashboard/operator/approvals', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ organizationId, action: 'decide', approvalId, decision }) });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new Error(errorMessage(body));
      setApprovalNotice(decision === 'approved' ? 'Permintaan disetujui. Perintah tidak dijalankan otomatis.' : 'Permintaan ditolak.');
      await refreshApprovals();
    } catch (cause) { setApprovalError(cause instanceof Error ? cause.message : 'Keputusan persetujuan gagal disimpan.'); }
    finally { setApprovalBusy(false); }
  }

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
          <span className="rounded border border-hairline px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-paper-dim">Governed</span>
        </div>
        <CardDescription>Susun rencana AI untuk pemeriksaan lintas domain. Distribusi publikasi tersedia melalui alur persetujuan terpisah.</CardDescription>
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
          <p className="m-0">Setiap langkah baca divalidasi ulang di server. Perubahan artikel dan distribusi publikasi memerlukan persetujuan persisten dari aktor berbeda; perubahan lain, kredensial, dan billing tetap dinonaktifkan.</p>
        </div>
        {error ? <FormNotice tone="error">{error}</FormNotice> : null}
        {plan ? <div className="space-y-2 rounded-md border border-hairline p-3">
          <p className="m-0 text-sm font-medium text-paper">Rencana tervalidasi ({plan.steps.length} langkah)</p>
          <ol className="m-0 list-decimal space-y-1 pl-5 text-xs text-paper-dim">
            {plan.steps.map((step) => <li key={step.id}><code>{step.capabilityId}</code></li>)}
          </ol>
        </div> : null}
        <div className="space-y-3 rounded-md border border-hairline p-3">
          <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="m-0 text-sm font-medium text-paper">Persetujuan AI Operator</p><p className="m-0 text-xs text-paper-dim">Persetujuan dicatat terpisah dan tidak menjalankan perintah otomatis.</p></div><Button type="button" size="sm" variant="outline" onClick={() => void refreshApprovals()} disabled={approvalBusy}><RefreshCw className="mr-2 h-3.5 w-3.5" /> Muat ulang</Button></div>
          {approvalError ? <FormNotice tone="error">{approvalError}</FormNotice> : null}
          {approvalNotice ? <FormNotice tone="success">{approvalNotice}</FormNotice> : null}
          {canRequest ? <div className="grid gap-2 rounded-md bg-bg p-3">
            <p className="m-0 text-xs font-medium text-paper">Ajukan distribusi artikel</p>
            <label className="grid gap-1 text-xs text-paper-dim">ID artikel
              <input value={articleId} onChange={(event) => setArticleId(event.currentTarget.value)} placeholder="UUID artikel" className="rounded-md border border-hairline bg-bg-raised px-2 py-2 text-sm text-paper" disabled={approvalBusy} />
            </label>
            <label className="grid gap-1 text-xs text-paper-dim">ID situs tujuan (pisahkan dengan koma atau baris baru)
              <textarea value={siteIds} onChange={(event) => setSiteIds(event.currentTarget.value)} placeholder="UUID situs tujuan" rows={2} className="rounded-md border border-hairline bg-bg-raised px-2 py-2 text-sm text-paper" disabled={approvalBusy} />
            </label>
            <div><Button type="button" size="sm" onClick={() => void requestPublicationApproval()} disabled={approvalBusy || articleId.trim().length === 0 || siteIds.trim().length === 0}>Ajukan persetujuan</Button></div>
          </div> : null}
          {canRequestArticleCreate ? <div className="grid gap-2 rounded-md bg-bg p-3">
            <p className="m-0 text-xs font-medium text-paper">Ajukan artikel baru</p>
            <label className="grid gap-1 text-xs text-paper-dim">Judul artikel<input value={createTitle} onChange={(event) => setCreateTitle(event.currentTarget.value)} maxLength={300} placeholder="Judul artikel" className="rounded-md border border-hairline bg-bg-raised px-2 py-2 text-sm text-paper" disabled={approvalBusy} /></label>
            <label className="grid gap-1 text-xs text-paper-dim">Slug URL (huruf kecil, angka, tanda hubung)<input value={createSlug} onChange={(event) => setCreateSlug(event.currentTarget.value)} maxLength={160} placeholder="judul-artikel" className="rounded-md border border-hairline bg-bg-raised px-2 py-2 text-sm text-paper" disabled={approvalBusy} /></label>
            <label className="grid gap-1 text-xs text-paper-dim">ID wilayah (opsional; kosong jika tidak diperlukan)<input value={createRegionId} onChange={(event) => setCreateRegionId(event.currentTarget.value)} placeholder="UUID wilayah atau kosong" className="rounded-md border border-hairline bg-bg-raised px-2 py-2 text-sm text-paper" disabled={approvalBusy} /></label>
            <label className="grid gap-1 text-xs text-paper-dim">Isi artikel<textarea value={createBody} onChange={(event) => setCreateBody(event.currentTarget.value)} maxLength={200000} rows={4} placeholder="Isi artikel lengkap" className="rounded-md border border-hairline bg-bg-raised px-2 py-2 text-sm text-paper" disabled={approvalBusy} /></label>
            <div><Button type="button" size="sm" onClick={() => void requestArticleCreateApproval()} disabled={approvalBusy || createTitle.trim().length === 0 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(createSlug.trim()) || createBody.trim().length === 0}>Ajukan pembuatan untuk disetujui</Button></div>
            <p className="m-0 text-[11px] text-paper-dim">ID artikel diturunkan dari ID persetujuan agar retry tidak membuat duplikat. Artikel baru berstatus draft.</p>
          </div> : null}
          {canRequestArticleUpdate ? <div className="grid gap-2 rounded-md bg-bg p-3">
            <p className="m-0 text-xs font-medium text-paper">Ajukan perubahan artikel</p>
            <label className="grid gap-1 text-xs text-paper-dim">ID artikel<input value={updateArticleId} onChange={(event) => setUpdateArticleId(event.currentTarget.value)} placeholder="UUID artikel" className="rounded-md border border-hairline bg-bg-raised px-2 py-2 text-sm text-paper" disabled={approvalBusy} /></label>
            <label className="grid gap-1 text-xs text-paper-dim">Versi artikel yang sedang diedit<input type="number" min="1" step="1" value={expectedVersion} onChange={(event) => setExpectedVersion(event.currentTarget.value)} placeholder="Contoh: 3" className="rounded-md border border-hairline bg-bg-raised px-2 py-2 text-sm text-paper" disabled={approvalBusy} /></label>
            <label className="grid gap-1 text-xs text-paper-dim">Judul baru (opsional)<input value={updateTitle} onChange={(event) => setUpdateTitle(event.currentTarget.value)} maxLength={200} className="rounded-md border border-hairline bg-bg-raised px-2 py-2 text-sm text-paper" disabled={approvalBusy} /></label>
            <label className="grid gap-1 text-xs text-paper-dim">Isi baru (opsional)<textarea value={updateBody} onChange={(event) => setUpdateBody(event.currentTarget.value)} maxLength={200000} rows={3} className="rounded-md border border-hairline bg-bg-raised px-2 py-2 text-sm text-paper" disabled={approvalBusy} /></label>
            <label className="grid gap-1 text-xs text-paper-dim">Status baru (opsional)<select value={updateStatus} onChange={(event) => setUpdateStatus(event.currentTarget.value)} className="rounded-md border border-hairline bg-bg-raised px-2 py-2 text-sm text-paper" disabled={approvalBusy}><option value="">Pertahankan status saat ini</option><option value="draft">Draft</option><option value="in_review">Dalam peninjauan</option><option value="scheduled">Terjadwal</option><option value="active">Aktif</option></select></label>
            <div><Button type="button" size="sm" onClick={() => void requestArticleUpdateApproval()} disabled={approvalBusy || updateArticleId.trim().length === 0 || !Number.isInteger(Number(expectedVersion)) || Number(expectedVersion) < 1 || (updateTitle.trim() === '' && updateBody.trim() === '' && updateStatus === '')}>Ajukan perubahan untuk disetujui</Button></div>
            <p className="m-0 text-[11px] text-paper-dim">Versi diverifikasi ulang sebelum perubahan diterapkan. Artikel arsip harus dipulihkan terlebih dahulu.</p>
          </div> : null}
          {approvals.length === 0 && !approvalBusy ? <p className="m-0 text-xs text-paper-dim">Belum ada permintaan persetujuan yang dapat ditampilkan.</p> : null}
          <ul className="m-0 space-y-2 p-0">{approvals.map((approval) => <li key={approval.id} className="list-none rounded-md border border-hairline p-3"><div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0 space-y-1"><code className="break-all text-xs text-paper">{approval.toolId}</code><p className="m-0 text-xs text-paper-dim">Status: {approval.state} · Kedaluwarsa: {new Date(approval.expiresAt).toLocaleString()}</p><pre className="max-h-28 overflow-auto whitespace-pre-wrap break-words rounded bg-bg p-2 text-[11px] text-paper-dim">{approvalInputForDisplay(approval.input)}</pre></div><div className="flex shrink-0 flex-wrap gap-2">{canReview && !approval.isRequester && approval.state === 'pending' ? <><Button type="button" size="sm" onClick={() => void decideApproval(approval.id, 'approved')} disabled={approvalBusy}><Check className="mr-1 h-3.5 w-3.5" /> Setujui</Button><Button type="button" size="sm" variant="destructive" onClick={() => void decideApproval(approval.id, 'rejected')} disabled={approvalBusy}><X className="mr-1 h-3.5 w-3.5" /> Tolak</Button></> : null}{approval.isRequester && approval.state === 'approved' ? <Button type="button" size="sm" onClick={() => void executeApproved(approval)} disabled={approvalBusy}>Jalankan yang disetujui</Button> : null}</div></div></li>)}</ul>
        </div>
        {results !== null ? <pre className="max-h-80 overflow-auto rounded-md border border-hairline bg-bg p-3 text-xs text-paper-dim">{approvalInputForDisplay(results)}</pre> : null}
        {busy ? <p role="status" className="m-0 text-xs text-paper-dim">Memproses permintaan…</p> : null}
      </CardContent>
    </Card>
  );
}
