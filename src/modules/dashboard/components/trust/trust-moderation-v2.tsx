'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  Flag,
  Gavel,
  Lock,
  ShieldAlert,
  Ticket,
  Trash2,
  UserRound,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SectionCard } from '@/modules/dashboard/components/shared/section-card';
import { AiModerationAssist } from '@/modules/ai/components/ai-moderation-assist';

interface ReportRow {
  readonly id: string;
  readonly orgId: string;
  readonly siteId: string | null;
  readonly articleId: string | null;
  readonly reporterContact: string;
  readonly reasonCategory: string;
  readonly details: string;
  readonly articleUrl: string | null;
  readonly status: string;
  readonly createdAt: string;
}
interface PrivacyRow {
  readonly id: string;
  readonly ticketNumber: string;
  readonly orgId: string;
  readonly requestType: string;
  readonly details: string;
  readonly status: string;
  readonly createdAt: string;
}
interface HoldRow {
  readonly id: string;
  readonly orgId: string;
  readonly reason: string;
  readonly heldBy: string;
  readonly createdAt: string;
  readonly releasedAt: string | null;
  readonly releasedBy: string | null;
}
interface ErasureRow {
  readonly id: string;
  readonly orgId: string;
  readonly requestedBy: string;
  readonly reason: string;
  readonly status: string;
  readonly scheduledFor: string;
  readonly attempts: number;
  readonly completedAt: string | null;
  readonly createdAt: string;
}

type Focus = 'queue' | 'privacy' | 'retention';

async function getScope<T>(scope: string): Promise<T> {
  const response = await fetch('/api/dashboard/moderation?scope=' + encodeURIComponent(scope));
  if (!response.ok) throw new Error('Moderation request failed');
  return (await response.json()) as T;
}

async function postCommand(action: string, payload: Record<string, unknown>) {
  const response = await fetch('/api/dashboard/moderation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, payload }),
  });
  if (!response.ok) throw new Error('Moderation command failed');
  return (await response.json()) as unknown;
}

export function TrustModerationV2({ organizationId }: { readonly organizationId: string }) {
  const [focus, setFocus] = useState<Focus>('queue');
  const [reports, setReports] = useState<readonly ReportRow[]>([]);
  const [privacy, setPrivacy] = useState<readonly PrivacyRow[]>([]);
  const [holds, setHolds] = useState<readonly HoldRow[]>([]);
  const [erasures, setErasures] = useState<readonly ErasureRow[]>([]);
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [privacyNote, setPrivacyNote] = useState<Record<string, string>>({});
  const [holdOrgId, setHoldOrgId] = useState('');
  const [holdReason, setHoldReason] = useState('');
  const [erasureOrgId, setErasureOrgId] = useState('');
  const [erasureReason, setErasureReason] = useState('');
  const [privacyType, setPrivacyType] = useState('access');
  const [privacyDetails, setPrivacyDetails] = useState('');
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const [reportRows, privacyRows, holdRows, erasureRows] = await Promise.all([
        getScope<readonly ReportRow[]>('reports'),
        getScope<readonly PrivacyRow[]>('privacy-requests'),
        getScope<readonly HoldRow[]>('holds'),
        getScope<readonly ErasureRow[]>('erasure-requests'),
      ]);
      setReports(reportRows);
      setPrivacy(privacyRows);
      setHolds(holdRows);
      setErasures(erasureRows);
      setLoaded(true);
    } catch {
      setError('Gagal memuat trust & moderation.');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => reload());
  }, [reload]);

  const decideReport = async (reportId: string, actionTaken: boolean) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await postCommand('report.decide', {
        reportId,
        actionTaken,
        note: notes[reportId]?.trim() || null,
      });
      setNotice(actionTaken ? 'Laporan ditandai sudah ditindak.' : 'Laporan ditolak.');
      await reload();
    } catch {
      setError('Keputusan laporan gagal disimpan.');
    } finally {
      setBusy(false);
    }
  };

  const decidePrivacy = async (
    ticket: string,
    status: 'in_progress' | 'fulfilled' | 'rejected',
  ) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await postCommand('privacy.decide', {
        ticket,
        status,
        note: privacyNote[ticket]?.trim() || null,
      });
      setNotice('Status permintaan privasi diperbarui.');
      await reload();
    } catch {
      setError('Keputusan permintaan privasi gagal disimpan.');
    } finally {
      setBusy(false);
    }
  };

  const createHold = async () => {
    if (holdOrgId.trim() === '' || holdReason.trim().length < 10) {
      setError('Isi organisasi dan alasan hold minimal 10 karakter.');
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await postCommand('hold.create', {
        organizationId: holdOrgId.trim(),
        reason: holdReason.trim(),
      });
      setHoldOrgId('');
      setHoldReason('');
      setNotice('Litigation hold aktif.');
      await reload();
    } catch {
      setError('Litigation hold gagal dibuat.');
    } finally {
      setBusy(false);
    }
  };

  const releaseHold = async (id: string) => {
    if (!window.confirm('Lepaskan litigation hold ini?')) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await postCommand('hold.release', { id });
      setNotice('Litigation hold dilepas.');
      await reload();
    } catch {
      setError('Litigation hold gagal dilepas.');
    } finally {
      setBusy(false);
    }
  };

  const requestErasure = async () => {
    if (erasureOrgId.trim() === '' || erasureReason.trim().length < 10) {
      setError('Isi organisasi dan alasan erasure minimal 10 karakter.');
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await postCommand('erasure.request', {
        organizationId: erasureOrgId.trim(),
        reason: erasureReason.trim(),
        scheduledFor: new Date().toISOString(),
      });
      setErasureOrgId('');
      setErasureReason('');
      setNotice('Erasure request masuk antrean.');
      await reload();
    } catch {
      setError('Erasure request gagal dibuat.');
    } finally {
      setBusy(false);
    }
  };

  const selected =
    selectedReport === null ? null : (reports.find((row) => row.id === selectedReport) ?? null);
  const openReports = reports.filter(
    (row) => row.status === 'received' || row.status === 'under_review',
  );
  const openPrivacy = privacy.filter(
    (row) => row.status === 'open' || row.status === 'in_progress',
  );
  const activeHolds = holds.filter((row) => row.releasedAt === null);
  const pendingErasures = erasures.filter(
    (row) => row.status === 'pending' || row.status === 'processing',
  );
  const attention =
    openReports.length + openPrivacy.length + activeHolds.length + pendingErasures.length;

  return (
    <div className="space-y-5">
      <header className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <p className="m-0 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-brass">
            Trust Operations
          </p>
          <h1 className="m-0 mt-1 font-serif text-2xl font-semibold tracking-tight text-paper sm:text-3xl">
            Trust & Moderation
          </h1>
          <p className="m-0 mt-2 max-w-2xl font-sans text-sm leading-6 text-paper-dim">
            Case queue untuk laporan konten, privacy requests, litigation hold, dan erasure.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ['Reports', loaded ? String(openReports.length) : '—', 'Open cases'],
            ['Privacy', loaded ? String(openPrivacy.length) : '—', 'Open requests'],
            ['Holds', loaded ? String(activeHolds.length) : '—', 'Active holds'],
            ['Attention', loaded ? String(attention) : '—', 'Needs review'],
          ].map(([label, value, note]) => (
            <div key={label} className="rounded-lg border border-hairline bg-bg-raised px-3 py-2.5">
              <p className="m-0 font-mono text-[9px] uppercase tracking-wider text-paper-faint">
                {label}
              </p>
              <p className="m-0 mt-1 font-mono text-lg font-semibold tabular-nums text-paper">
                {value}
              </p>
              <p className="m-0 mt-0.5 truncate text-[10px] text-paper-faint">{note}</p>
            </div>
          ))}
        </div>
      </header>

      {error !== null ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-danger/30 bg-danger/[0.04] px-3 py-2 text-xs text-danger"
        >
          <span>{error}</span>
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void reload()}>
            Coba lagi
          </Button>
        </div>
      ) : null}
      {notice !== null ? (
        <p
          role="status"
          className="m-0 rounded-lg border border-signal/30 bg-signal/[0.04] px-3 py-2 text-xs text-signal"
        >
          {notice}
        </p>
      ) : null}
      {busy && !loaded ? (
        <p role="status" className="m-0 rounded-lg border border-hairline bg-bg-raised px-3 py-2 text-xs text-paper-dim">
          Memuat trust & moderation…
        </p>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[230px_minmax(0,1fr)]">
        <nav
          aria-label="Area Trust & Moderation"
          className="space-y-1 rounded-xl border border-hairline bg-bg-raised p-2"
        >
          {[
            {
              id: 'queue' as const,
              label: 'Case Queue',
              description: 'Report review + AI assist',
              icon: Flag,
            },
            {
              id: 'privacy' as const,
              label: 'Privacy Operations',
              description: 'Requests + decisions',
              icon: Ticket,
            },
            {
              id: 'retention' as const,
              label: 'Retention Controls',
              description: 'Holds + erasure',
              icon: Lock,
            },
          ].map(({ id, label, description, icon: Icon }) => {
            const active = focus === id;
            return (
              <button
                key={String(id)}
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => setFocus(id as Focus)}
                className={
                  active
                    ? 'flex w-full items-start gap-3 rounded-lg bg-bg-raised-2 px-3 py-3 text-left text-paper ring-1 ring-brass/30'
                    : 'flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left text-paper-dim hover:bg-bg-raised-2 hover:text-paper'
                }
              >
                <Icon
                  className={
                    active
                      ? 'mt-0.5 h-4 w-4 flex-none text-brass'
                      : 'mt-0.5 h-4 w-4 flex-none text-paper-faint'
                  }
                  aria-hidden="true"
                />
                <span className="min-w-0">
                  <span className="block text-xs font-semibold">{label}</span>
                  <span className="mt-0.5 block text-[10px] leading-4 text-paper-faint">
                    {description}
                  </span>
                </span>
              </button>
            );
          })}
        </nav>

        <div className="min-w-0">
          {focus === 'queue' ? (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_330px]">
              <SectionCard
                icon={Flag}
                title="Moderation Queue"
                eyebrow={String(openReports.length) + ' open cases'}
              >
                {!loaded && busy ? null : !loaded ? (
                  <p className="m-0 py-6 text-center text-xs text-paper-faint">Snapshot belum tersedia. Coba muat ulang.</p>
                ) : openReports.length === 0 ? (
                  <p className="m-0 py-6 text-center text-xs text-signal">
                    Tidak ada laporan yang membutuhkan review.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {openReports.map((row) => (
                      <button
                        key={row.id}
                        type="button"
                        onClick={() => setSelectedReport(row.id)}
                        className={
                          selectedReport === row.id
                            ? 'w-full rounded-lg border border-brass/30 bg-bg-raised-2 p-3 text-left'
                            : 'w-full rounded-lg border border-hairline bg-bg p-3 text-left hover:bg-bg-raised-2'
                        }
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="min-w-0 truncate font-sans text-xs font-semibold text-paper">
                            {row.reasonCategory}
                          </span>
                          <Badge variant="outline" className="font-mono text-[9px] uppercase">
                            {row.status}
                          </Badge>
                        </div>
                        <p className="m-0 mt-1 line-clamp-2 text-[11px] leading-4 text-paper-dim">
                          {row.details}
                        </p>
                        <p className="m-0 mt-1 font-mono text-[9px] text-paper-faint">
                          {row.orgId}
                          {row.articleId ? ' · article ' + row.articleId : ''}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </SectionCard>

              <SectionCard icon={Gavel} title="Case Review" eyebrow="Decision surface">
                {selected === null ? (
                  <p className="m-0 py-6 text-center text-xs text-paper-faint">
                    Pilih laporan untuk membuka evidence, AI assist, dan keputusan.
                  </p>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <p className="m-0 text-[9px] uppercase tracking-wider text-paper-faint">
                        Report
                      </p>
                      <p className="m-0 mt-1 font-mono text-xs text-paper">{selected.id}</p>
                    </div>
                    <p className="m-0 text-xs leading-5 text-paper-dim">{selected.details}</p>
                    <AiModerationAssist
                      organizationId={organizationId}
                      category={selected.reasonCategory}
                      details={selected.details}
                      onReply={(draft) =>
                        setNotes((current) => ({ ...current, [selected.id]: draft }))
                      }
                    />
                    <Textarea
                      value={notes[selected.id] ?? ''}
                      onChange={(e) =>
                        setNotes((current) => ({ ...current, [selected.id]: e.target.value }))
                      }
                      placeholder="Catatan keputusan…"
                      className="min-h-20 text-xs"
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={busy}
                        onClick={() => void decideReport(selected.id, true)}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Tindak
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => void decideReport(selected.id, false)}
                      >
                        <ShieldAlert className="h-3.5 w-3.5" />
                        Tolak
                      </Button>
                    </div>
                  </div>
                )}
              </SectionCard>
            </div>
          ) : null}

          {focus === 'privacy' ? (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_330px]">
              <SectionCard
                icon={Ticket}
                title="Privacy Request Queue"
                eyebrow={String(openPrivacy.length) + ' open'}
              >
                <div className="space-y-2">
                  {openPrivacy.map((row) => (
                    <div key={row.id} className="rounded-lg border border-hairline bg-bg p-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-mono text-xs text-paper">{row.ticketNumber}</span>
                        <Badge variant="outline" className="font-mono text-[9px] uppercase">
                          {row.status}
                        </Badge>
                      </div>
                      <p className="m-0 mt-1 text-[11px] text-paper-dim">
                        {row.requestType} · {row.details}
                      </p>
                      <Input
                        value={privacyNote[row.ticketNumber] ?? ''}
                        onChange={(e) =>
                          setPrivacyNote((current) => ({
                            ...current,
                            [row.ticketNumber]: e.target.value,
                          }))
                        }
                        placeholder="Catatan keputusan…"
                        className="mt-2 text-xs"
                      />
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => void decidePrivacy(row.ticketNumber, 'in_progress')}
                        >
                          In progress
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          disabled={busy}
                          onClick={() => void decidePrivacy(row.ticketNumber, 'fulfilled')}
                        >
                          Fulfilled
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => void decidePrivacy(row.ticketNumber, 'rejected')}
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
              <SectionCard icon={UserRound} title="New Privacy Request" eyebrow="Create case">
                <div className="space-y-3">
                  <select
                    aria-label="Privacy request type"
                    value={privacyType}
                    onChange={(e) => setPrivacyType(e.target.value)}
                    className="h-9 w-full rounded-md border border-hairline bg-bg px-2 text-xs text-paper"
                  >
                    <option value="access">Access</option>
                    <option value="correction">Correction</option>
                    <option value="deletion">Deletion</option>
                    <option value="portability">Portability</option>
                    <option value="restriction">Restriction</option>
                  </select>
                  <Textarea
                    value={privacyDetails}
                    onChange={(e) => setPrivacyDetails(e.target.value)}
                    placeholder="Uraian permintaan…"
                    className="min-h-24 text-xs"
                  />
                  <Button
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      if (privacyDetails.trim().length < 10) {
                        setError('Uraian minimal 10 karakter.');
                        return;
                      }
                      setBusy(true);
                      try {
                        const result = (await postCommand('privacy.submit', {
                          orgId: organizationId,
                          requestType: privacyType,
                          details: privacyDetails.trim(),
                        })) as { ticketNumber: string };
                        setNotice('Tiket ' + result.ticketNumber + ' tercatat.');
                        setPrivacyDetails('');
                        await reload();
                      } catch {
                        setError('Privacy request gagal dibuat.');
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Create request
                  </Button>
                </div>
              </SectionCard>
            </div>
          ) : null}

          {focus === 'retention' ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <SectionCard
                icon={Lock}
                title="Litigation Holds"
                eyebrow={String(activeHolds.length) + ' active'}
              >
                <div className="space-y-2">
                  {activeHolds.map((row) => (
                    <div key={row.id} className="rounded-lg border border-hairline bg-bg p-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-mono text-xs text-paper">{row.orgId}</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => void releaseHold(row.id)}
                        >
                          Release
                        </Button>
                      </div>
                      <p className="m-0 mt-1 text-[11px] text-paper-dim">{row.reason}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 space-y-2 border-t border-hairline pt-4">
                  <Input
                    value={holdOrgId}
                    onChange={(e) => setHoldOrgId(e.target.value)}
                    placeholder="Organization ID"
                    className="text-xs"
                  />
                  <Textarea
                    value={holdReason}
                    onChange={(e) => setHoldReason(e.target.value)}
                    placeholder="Alasan litigation hold…"
                    className="min-h-20 text-xs"
                  />
                  <Button type="button" disabled={busy} onClick={() => void createHold()}>
                    Create hold
                  </Button>
                </div>
              </SectionCard>
              <SectionCard
                icon={Trash2}
                title="Erasure Queue"
                eyebrow={String(pendingErasures.length) + ' pending'}
              >
                <div className="space-y-2">
                  {pendingErasures.map((row) => (
                    <div key={row.id} className="rounded-lg border border-hairline bg-bg p-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-mono text-xs text-paper">{row.orgId}</span>
                        <Badge variant="outline" className="font-mono text-[9px] uppercase">
                          {row.status}
                        </Badge>
                      </div>
                      <p className="m-0 mt-1 text-[11px] text-paper-dim">
                        {row.reason} · {row.attempts} attempts
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 space-y-2 border-t border-hairline pt-4">
                  <Input
                    value={erasureOrgId}
                    onChange={(e) => setErasureOrgId(e.target.value)}
                    placeholder="Organization ID"
                    className="text-xs"
                  />
                  <Textarea
                    value={erasureReason}
                    onChange={(e) => setErasureReason(e.target.value)}
                    placeholder="Alasan erasure…"
                    className="min-h-20 text-xs"
                  />
                  <Button type="button" disabled={busy} onClick={() => void requestErasure()}>
                    Request erasure
                  </Button>
                </div>
              </SectionCard>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
