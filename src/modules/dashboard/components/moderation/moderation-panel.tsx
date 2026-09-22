'use client';

import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DashboardSelect, DashboardSelectItem } from '@/modules/dashboard/components/shared/dashboard-select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

import { FormNotice } from '@/modules/dashboard/components/shared/form-notice';
import { EmptyState } from '@/modules/dashboard/components/empty-state';
import { formatDate, formatRelative } from '@/modules/dashboard/components/shared/dashboard-dates';

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

async function api(path: string, init?: RequestInit) {
  const response = await fetch(path, { cache: 'no-store', ...init });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as unknown;
}

const CATEGORY_LABELS: Readonly<Record<string, string>> = {
  copyright: 'Hak cipta',
  defamation: 'Pencemaran nama',
  privacy: 'Privasi',
  hate: 'Ujaran kebencian',
  misinformation: 'Misinformasi',
  other: 'Lainnya',
};

export function ModerationPanel({ organizationId }: { readonly organizationId: string }) {
  const [reports, setReports] = useState<readonly ReportRow[]>([]);
  const [privacy, setPrivacy] = useState<readonly PrivacyRow[]>([]);
  const [holds, setHolds] = useState<readonly HoldRow[]>([]);
  const [holdOrgId, setHoldOrgId] = useState('');
  const [holdReason, setHoldReason] = useState('');
  const [erasures, setErasures] = useState<readonly ErasureRow[]>([]);
  const [erasureOrgId, setErasureOrgId] = useState('');
  const [erasureReason, setErasureReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [decisionNote, setDecisionNote] = useState<{ [id: string]: string }>({});
  const [privacyType, setPrivacyType] = useState('access');
  const [privacyDetails, setPrivacyDetails] = useState('');

  const reload = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const [reportBody, privacyBody, holdsBody, erasureBody] = await Promise.all([
        api('/api/dashboard/moderation?scope=reports') as Promise<readonly ReportRow[]>,
        api('/api/dashboard/moderation?scope=privacy-requests') as Promise<readonly PrivacyRow[]>,
        api('/api/dashboard/moderation?scope=holds') as Promise<readonly HoldRow[]>,
        api('/api/dashboard/moderation?scope=erasure-requests') as Promise<readonly ErasureRow[]>,
      ]);
      setReports(reportBody);
      setPrivacy(privacyBody);
      setHolds(holdsBody);
      setErasures(erasureBody);
    } catch {
      setError('Gagal memuat data moderasi.');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => reload());
  }, [reload]);

  const post = useCallback(
    async (action: string, payload: Record<string, unknown>) => {
      const body = (await api('/api/dashboard/moderation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload }),
      })) as unknown;
      return body;
    },
    [],
  );

  const decideReport = async (reportId: string, actionTaken: boolean) => {
    if (actionTaken && !window.confirm('Tandai laporan ini sudah ditindak (pastikan konten sudah ditarik)?')) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const note = decisionNote[reportId]?.trim() || null;
      await post('report.decide', { reportId, actionTaken, note });
      setNotice(actionTaken ? 'Laporan ditandai sudah ditindak.' : 'Laporan ditolak.');
      await reload();
    } catch {
      setError('Keputusan laporan gagal disimpan.');
    } finally {
      setBusy(false);
    }
  };

  const submitPrivacy = async () => {
    if (privacyDetails.trim().length < 10) {
      setError('Uraian permintaan minimal 10 karakter.');
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const body = (await post('privacy.submit', { orgId: organizationId, requestType: privacyType, details: privacyDetails.trim() })) as { ticketNumber: string };
      setNotice(`Permintaan tercatat dengan tiket ${body.ticketNumber}. Target penyelesaian 30 hari kalender.`);
      setPrivacyDetails('');
      await reload();
    } catch {
      setError('Permintaan data gagal dikirim.');
    } finally {
      setBusy(false);
    }
  };

  const createHold = async () => {
    if (holdOrgId.trim() === '' || holdReason.trim().length < 10) {
      setError('Isi ID organisasi dan alasan penundaan (min. 10 karakter).');
      return;
    }
    if (!window.confirm(`Tahan penghapusan untuk organisasi ${holdOrgId.trim()}? Pembersihan dan penghapusan melewatkan organisasi ini sampai penundaan dilepas.`)) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await post('hold.create', { organizationId: holdOrgId.trim(), reason: holdReason.trim() });
      setNotice('Penundaan hapus aktif.');
      setHoldOrgId('');
      setHoldReason('');
      await reload();
    } catch {
      setError('Penundaan gagal disimpan (mungkin organisasi ini sudah ditunda).');
    } finally {
      setBusy(false);
    }
  };

  const requestErasure = async () => {
    if (erasureOrgId.trim() === '' || erasureReason.trim().length < 10) {
      setError('Isi ID organisasi dan alasan hapus data (min. 10 karakter).');
      return;
    }
    if (!window.confirm(`Hapus data organisasi ${erasureOrgId.trim()} secara permanen? Arsip legal (audit, faktur, order) dipertahankan. Aksi ini tidak bisa dibatalkan setelah sistem berjalan.`)) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await post('erasure.request', {
        organizationId: erasureOrgId.trim(),
        reason: erasureReason.trim(),
        scheduledFor: new Date().toISOString(),
      });
      setNotice('Penghapusan diminta. Sistem harian mengeksekusi; organisasi yang ditunda akan dilewatkan.');
      setErasureOrgId('');
      setErasureReason('');
      await reload();
    } catch {
      setError('Permintaan hapus data gagal disimpan.');
    } finally {
      setBusy(false);
    }
  };

  const releaseHold = async (holdId: string) => {    if (!window.confirm('Lepas penundaan ini? Penghapusan terjadwal berjalan kembali.')) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await post('hold.release', { holdId });
      setNotice('Penundaan dilepas.');
      await reload();
    } catch {
      setError('Pelepasan penundaan gagal.');
    } finally {
      setBusy(false);
    }
  };

  const decidePrivacy = async (ticket: string, status: string) => {    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await post('privacy.decide', { ticket, status, note: decisionNote[ticket]?.trim() || null });
      setNotice(`Tiket ${ticket} → ${status}.`);
      await reload();
    } catch {
      setError('Keputusan tiket gagal disimpan.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Tabs defaultValue="laporan" className="w-full">
      <TabsList aria-label="Bagian moderasi" className="max-w-full overflow-x-auto overflow-y-clip">
        <TabsTrigger value="laporan" className="flex-none">Laporan</TabsTrigger>
        <TabsTrigger value="privasi" className="flex-none">Privasi</TabsTrigger>
        <TabsTrigger value="retensi" className="flex-none">Retensi</TabsTrigger>
      </TabsList>
      <TabsContent keepMounted value="laporan">
        <section aria-label="Laporan konten" className="rounded-lg border border-hairline bg-bg-raised p-5 sm:p-6">
        <p className="m-0 font-mono text-[11px] uppercase tracking-wider text-paper-faint">Laporan konten publik</p>
        <p className="m-0 mt-1 font-sans text-xs leading-relaxed text-paper-dim">
          SLA peninjauan 1x24 jam (Ketentuan §14). Tindakan penarikan dilakukan lewat alur unpublish yang sudah ada,
          lalu laporan ditandai di sini sebagai bukti penanganan.
        </p>
        {busy ? <p className="m-0 mt-1 font-sans text-xs text-paper-faint">Memuat…</p> : null}
        {error ? <FormNotice tone="error">{error}</FormNotice> : null}
        {notice ? <FormNotice tone="success">{notice}</FormNotice> : null}
        <ul className="m-0 mt-2 grid list-none gap-0 p-0 md:grid-cols-2 md:gap-x-10">
          {reports.map((report) => (
            <li key={report.id} className="border-b border-hairline py-3">
              <p className="m-0 font-sans text-sm font-medium text-paper">
                {CATEGORY_LABELS[report.reasonCategory] ?? report.reasonCategory} · {report.status}
              </p>
              <p className="m-0 mt-1 font-sans text-xs leading-relaxed text-paper-dim">{report.details}</p>
              <p className="m-0 mt-0.5 font-mono text-[11px] tabular-nums text-paper-faint">
                {report.id} · {report.reporterContact}
              </p>
              {report.status === 'received' || report.status === 'under_review' ? (
                <div className="mt-2 flex flex-col gap-2">
                  <Input
                    type="text" value={decisionNote[report.id] ?? ''} disabled={busy}
                    onChange={(event) => setDecisionNote((prev) => ({ ...prev, [report.id]: event.target.value }))}
                    placeholder="Catatan penanganan (opsional)"
                    aria-label="Catatan penanganan laporan"
                    className="font-sans text-xs"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button" variant="default" onClick={() => void decideReport(report.id, true)} disabled={busy}
                    >
                      Sudah ditindak
                    </Button>
                    <Button
                      type="button" variant="outline" onClick={() => void decideReport(report.id, false)} disabled={busy}
                    >
                      Tolak
                    </Button>
                  </div>
                </div>
              ) : null}
            </li>
          ))}
          {reports.length === 0 ? <li><EmptyState title="Belum ada laporan konten." description="Data akan tampil di sini setelah tersedia." /></li> : null}
        </ul>
      </section>
      </TabsContent>
      <TabsContent keepMounted value="privasi">
        <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
          <section aria-label="Permintaan data" className="rounded-lg border border-hairline bg-bg-raised p-5 sm:p-6">
        <p className="m-0 font-mono text-[11px] uppercase tracking-wider text-paper-faint">Permintaan data baru</p>
        <div className="mt-3 flex flex-col gap-2">
          <DashboardSelect
            value={privacyType} disabled={busy}
            placeholder="Pilih jenis permintaan"
            onValueChange={(next) => { if (next !== null) setPrivacyType(next); }}
            ariaLabel="Jenis permintaan data"
          >
            <DashboardSelectItem value="access">Akses / salinan data</DashboardSelectItem>
            <DashboardSelectItem value="correction">Koreksi data</DashboardSelectItem>
            <DashboardSelectItem value="deletion">Penghapusan data</DashboardSelectItem>
            <DashboardSelectItem value="portability">Portabilitas data</DashboardSelectItem>
            <DashboardSelectItem value="restriction">Pembatasan pemrosesan</DashboardSelectItem>
          </DashboardSelect>
          <Textarea
            value={privacyDetails} onChange={(event) => setPrivacyDetails(event.target.value)} disabled={busy}
            placeholder="Uraian spesifik permintaan (min. 10 karakter)"
            aria-label="Uraian permintaan data" rows={3}
            className="font-sans text-xs"
          />
          <Button
            type="button" variant="default" size="lg" onClick={submitPrivacy} disabled={busy} className="w-full sm:w-auto"
          >
            Kirim permintaan
          </Button>
        </div>
      </section>

      <section aria-label="Tiket permintaan data" className="rounded-lg border border-hairline bg-bg-raised p-5 sm:p-6">
        <p className="m-0 font-mono text-[11px] uppercase tracking-wider text-paper-faint">Tiket permintaan (SLA 30 hari)</p>
        <ul className="m-0 mt-2 grid list-none gap-0 p-0">
          {privacy.map((ticket) => (
            <li key={ticket.id} className="border-b border-hairline py-3 last:border-b-0">
              <p className="m-0 font-sans text-sm font-medium text-paper">
                {ticket.ticketNumber} · {ticket.requestType} · {ticket.status}
              </p>
              <p className="m-0 mt-1 font-sans text-xs leading-relaxed text-paper-dim">{ticket.details}</p>
              {ticket.status === 'open' || ticket.status === 'in_progress' ? (
                <div className="mt-2 flex flex-col gap-2">
                  <Input
                    type="text" value={decisionNote[ticket.ticketNumber] ?? ''} disabled={busy}
                    onChange={(event) => setDecisionNote((prev) => ({ ...prev, [ticket.ticketNumber]: event.target.value }))}
                    placeholder="Catatan penyelesaian (opsional)"
                    aria-label="Catatan penyelesaian tiket"
                    className="font-sans text-xs"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    {(['in_progress', 'fulfilled', 'rejected'] as const).map((status) => (
                      <Button
                        key={status} type="button" variant="outline" size="sm" onClick={() => void decidePrivacy(ticket.ticketNumber, status)} disabled={busy}
                      >
                        {status}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : null}
            </li>
          ))}
          {privacy.length === 0 ? <li><EmptyState title="Belum ada tiket permintaan data." description="Data akan tampil di sini setelah tersedia." /></li> : null}
        </ul>
      </section>
        </div>
      </TabsContent>
      <TabsContent keepMounted value="retensi">
        <div className="grid grid-cols-1 items-start gap-4">
          <section aria-label="Tunda hapus resmi" className="rounded-lg border border-hairline bg-bg-raised p-5 sm:p-6">
        <p className="m-0 font-mono text-[11px] uppercase tracking-wider text-paper-faint">Tunda hapus resmi</p>
        <p className="m-0 mt-1 font-sans text-xs leading-relaxed text-paper-dim">
          Organisasi yang ditunda dilewatkan pembersihan retensi dan penghapusan sampai penundaan dilepas. Satu penundaan aktif per organisasi.
        </p>
        <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto]">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="hold-org-id" className="font-sans text-xs font-medium text-paper-dim">
              ID organisasi
            </Label>
            <Input
              id="hold-org-id" value={holdOrgId} onChange={(event) => setHoldOrgId(event.target.value)} disabled={busy}
              placeholder="ID organisasi…" spellCheck={false}
              className="font-mono text-xs"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="hold-reason" className="font-sans text-xs font-medium text-paper-dim">
              Alasan perkara (min. 10 karakter)
            </Label>
            <Input
              id="hold-reason" value={holdReason} onChange={(event) => setHoldReason(event.target.value)} disabled={busy}
              placeholder="Perkara No. … / permintaan aparat …"
              className="font-sans text-xs"
            />
          </div>
          <div className="flex items-end">
            <Button
              type="button" variant="default" size="lg" onClick={() => void createHold()} disabled={busy} className="w-full sm:w-auto"
            >
              Tahan hapus
            </Button>
          </div>
        </div>
        <ul className="m-0 mt-2 grid list-none gap-0 p-0 md:grid-cols-2 md:gap-x-10">
          {holds.map((hold) => (
            <li key={hold.id} className="border-b border-hairline py-3">
              <p className="m-0 font-sans text-sm font-medium text-paper">
                {hold.releasedAt === null ? 'Aktif' : 'Dilepas'} · {hold.orgId}
              </p>
              <p className="m-0 mt-1 font-sans text-xs leading-relaxed text-paper-dim">{hold.reason}</p>
              <p className="m-0 mt-0.5 font-mono text-[11px] tabular-nums text-paper-faint">
                {hold.id} · {formatDate(hold.createdAt)} ({formatRelative(hold.createdAt)})
              </p>
              {hold.releasedAt === null ? (
                <div className="mt-2">
                  <Button
                    type="button" variant="outline" onClick={() => void releaseHold(hold.id)} disabled={busy}
                  >
                    Lepas penundaan
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
          {holds.length === 0 ? <li><EmptyState title="Belum ada penundaan." description="Data akan tampil di sini setelah tersedia." /></li> : null}
        </ul>
      </section>

      <section aria-label="Hapus data organisasi" className="rounded-lg border border-error/60 bg-bg-raised p-5 sm:p-6">
        <p className="m-0 font-mono text-[11px] uppercase tracking-wider text-paper-faint">Hapus data organisasi</p>
        <p className="m-0 mt-1 font-sans text-xs leading-relaxed text-paper-dim">
          Hapus permanen data operasional + samarkan data pribadi anggota. Arsip legal (audit, faktur, order,
          langganan) dipertahankan; organisasi menjadi arsip. Organisasi yang ditunda atau organisasi platform akan ditolak sistem.
        </p>
        <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto]">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="erasure-org-id" className="font-sans text-xs font-medium text-paper-dim">
              ID organisasi
            </Label>
            <Input
              id="erasure-org-id" value={erasureOrgId} onChange={(event) => setErasureOrgId(event.target.value)} disabled={busy}
              placeholder="ID organisasi…" spellCheck={false}
              className="font-mono text-xs"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="erasure-reason" className="font-sans text-xs font-medium text-paper-dim">
              Alasan (min. 10 karakter)
            </Label>
            <Input
              id="erasure-reason" value={erasureReason} onChange={(event) => setErasureReason(event.target.value)} disabled={busy}
              placeholder="Alasan penghapusan data…"
              className="font-sans text-xs"
            />
          </div>
          <div className="flex items-end">
            <Button
              type="button" variant="destructive" size="lg" onClick={() => void requestErasure()} disabled={busy} className="w-full sm:w-auto"
            >
              Minta hapus data
            </Button>
          </div>
        </div>
        <ul className="m-0 mt-2 grid list-none gap-0 p-0 md:grid-cols-2 md:gap-x-10">
          {erasures.map((row) => (
            <li key={row.id} className="border-b border-hairline py-3">
              <p className="m-0 font-sans text-sm font-medium text-paper">
                {row.status} · {row.orgId}
              </p>
              <p className="m-0 mt-1 font-sans text-xs leading-relaxed text-paper-dim">{row.reason}</p>
              <p className="m-0 mt-0.5 font-mono text-[11px] tabular-nums text-paper-faint">
                {row.id} · {formatDate(row.createdAt)} ({formatRelative(row.createdAt)})
                {row.completedAt ? ` → ${formatDate(row.completedAt)}` : ''}
              </p>
            </li>
          ))}
          {erasures.length === 0 ? <li><EmptyState title="Belum ada permintaan hapus data." description="Data akan tampil di sini setelah tersedia." /></li> : null}
        </ul>
      </section>
        </div>
      </TabsContent>
    </Tabs>
  );
}
