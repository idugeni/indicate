'use client';

import { useMemo, useState, useTransition, type FormEvent } from 'react';
import {
  Archive,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Loader2,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
  Users,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DashboardSelect, DashboardSelectItem } from '@/modules/dashboard/components/shared/dashboard-select';
import { SectionCard } from '@/modules/dashboard/components/shared/section-card';
import { AiPublisherVerify } from '@/modules/ai/components/ai-publisher-verify';
import type { DashboardCommand } from '@/modules/dashboard/command';

type PublisherStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

interface PublisherRecord {
  readonly id: string;
  readonly name: string;
  readonly attributionLabel?: string | undefined;
  readonly type?: string | undefined;
  readonly verificationStatus: string;
  readonly status?: string | undefined;
  readonly evidenceReference?: string | null | undefined;
  readonly version: number;
  readonly createdAt?: string | undefined;
}

interface AffiliationRecord {
  readonly publisherId: string;
  readonly institutionName: string;
  readonly siteId: string;
  readonly cityName?: string | null | undefined;
  readonly active?: boolean | undefined;
  readonly portalCount?: number | undefined;
}

interface PublisherData {
  readonly publishers?: readonly PublisherRecord[];
  readonly affiliations?: readonly AffiliationRecord[];
  readonly affiliationTotal?: number;
  readonly affiliationTotalInScope?: number;
}

const STATUS_META: Readonly<Record<PublisherStatus, { label: string; icon: typeof CheckCircle2; className: string }>> = {
  verified: { label: 'Terverifikasi', icon: CheckCircle2, className: 'text-emerald-400' },
  pending: { label: 'Menunggu', icon: Clock3, className: 'text-amber-400' },
  rejected: { label: 'Ditolak', icon: XCircle, className: 'text-rose-400' },
  unverified: { label: 'Belum diverifikasi', icon: ShieldAlert, className: 'text-paper-dim' },
};

function statusMeta(value: string) {
  return STATUS_META[value as PublisherStatus] ?? STATUS_META.unverified;
}

function normalizeType(value: string | undefined) {
  if (value === 'government_institution') return 'Institusi / lembaga';
  if (value === 'company') return 'Badan usaha / korporasi';
  return 'Penerbit independen';
}

export function PublisherNetworkV2({
  data,
  command,
  organizationId,
  onFilterApply,
  onRefresh,
}: {
  readonly data: unknown;
  readonly command: DashboardCommand;
  readonly organizationId: string;
  readonly onFilterApply: (query: string) => void;
  readonly onRefresh: () => void;
}) {
  const model = (data as PublisherData | null) ?? {};
  const publishers = model.publishers ?? [];
  const affiliations = model.affiliations ?? [];
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | PublisherStatus>('all');
  const [selectedId, setSelectedId] = useState(publishers[0]?.id ?? '');
  const [creating, setCreating] = useState(false);
  const [isMutating, startTransition] = useTransition();
  const [createName, setCreateName] = useState('');
  const [createType, setCreateType] = useState('independent_publisher');
  const [createAttribution, setCreateAttribution] = useState('');
  const [createEvidence, setCreateEvidence] = useState('');

  const visiblePublishers = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return publishers.filter((publisher) => {
      const matchesQuery = needle === ''
        || publisher.name.toLowerCase().includes(needle)
        || (publisher.attributionLabel ?? '').toLowerCase().includes(needle);
      return matchesQuery && (status === 'all' || publisher.verificationStatus === status);
    });
  }, [publishers, query, status]);

  const selected = publishers.find((publisher) => publisher.id === selectedId)
    ?? visiblePublishers[0]
    ?? publishers[0]
    ?? null;

  const selectedAffiliations = selected === null
    ? []
    : affiliations.filter((item) => item.publisherId === selected.id);

  const counts = useMemo(() => ({
    total: publishers.length,
    verified: publishers.filter((item) => item.verificationStatus === 'verified').length,
    pending: publishers.filter((item) => item.verificationStatus === 'pending').length,
    activeClaims: affiliations.filter((item) => item.active !== false).length,
  }), [publishers, affiliations]);

  const applySearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onFilterApply(query.trim());
  };

  const runDecision = (action: 'publisher.submit' | 'publisher.approve' | 'publisher.reject' | 'publisher.archive') => {
    if (selected === null) return;
    if (action === 'publisher.reject') {
      const reason = window.prompt('Alasan penolakan penerbit:')?.trim() ?? '';
      if (reason === '') return;
      startTransition(async () => {
        try {
          await command(action, { id: selected.id, expectedVersion: selected.version, reason }, { refresh: true });
          toast.success('Penerbit ditolak.');
          onRefresh();
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Keputusan gagal diterapkan.');
        }
      });
      return;
    }
    startTransition(async () => {
      try {
        await command(action, { id: selected.id, expectedVersion: selected.version }, { refresh: true });
        toast.success('Status penerbit diperbarui.');
        onRefresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Keputusan gagal diterapkan.');
      }
    });
  };

  const createPublisher = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = createName.trim();
    const attributionLabel = createAttribution.trim();
    if (name === '' || attributionLabel === '') {
      toast.error('Nama resmi dan label atribusi wajib diisi.');
      return;
    }
    startTransition(async () => {
      try {
        await command('publisher.create', {
          name,
          type: createType,
          attributionLabel,
          contacts: {},
          evidenceReference: createEvidence.trim() || null,
        }, { refresh: true });
        toast.success('Penerbit berhasil didaftarkan.');
        setCreateName('');
        setCreateAttribution('');
        setCreateEvidence('');
        setCreating(false);
        onRefresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Pendaftaran penerbit gagal.');
      }
    });
  };

  return (
    <section className="space-y-5" aria-label="Publisher Network V2">
      <div className="flex flex-col gap-4 border-b border-hairline pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-brass">Source Network</p>
          <h1 className="mt-1 font-sans text-xl font-semibold tracking-tight text-paper sm:text-2xl">Publisher Network</h1>
          <p className="mt-1 max-w-2xl font-sans text-xs leading-relaxed text-paper-dim">
            Satu workspace untuk melihat kesehatan penerbit, klaim portal, dan keputusan verifikasi.
          </p>
        </div>
        <Button type="button" onClick={() => setCreating((value) => !value)} className="gap-2">
          <Plus className="h-4 w-4" aria-hidden="true" />
          {creating ? 'Tutup registrasi' : 'Daftar penerbit'}
        </Button>
      </div>

      {creating ? (
        <SectionCard icon={Plus} title="Registrasi publisher" eyebrow="Create workflow">
          <form onSubmit={createPublisher} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="publisher-v2-name">Nama resmi</Label>
              <Input id="publisher-v2-name" value={createName} onChange={(event) => setCreateName(event.target.value)} placeholder="Nama media / lembaga" disabled={isMutating} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="publisher-v2-type">Klasifikasi</Label>
              <DashboardSelect id="publisher-v2-type" value={createType} onValueChange={(value) => setCreateType(value ?? 'independent_publisher')} disabled={isMutating}>
                <DashboardSelectItem value="independent_publisher">Penerbit independen regional</DashboardSelectItem>
                <DashboardSelectItem value="government_institution">Institusi / lembaga kedinasan</DashboardSelectItem>
                <DashboardSelectItem value="company">Badan usaha / korporasi media</DashboardSelectItem>
              </DashboardSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="publisher-v2-attribution">Label atribusi</Label>
              <Input id="publisher-v2-attribution" value={createAttribution} onChange={(event) => setCreateAttribution(event.target.value)} placeholder="Label tampil di artikel" disabled={isMutating} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="publisher-v2-evidence">Referensi bukti legalitas <span className="text-paper-faint">(opsional)</span></Label>
              <Input id="publisher-v2-evidence" value={createEvidence} onChange={(event) => setCreateEvidence(event.target.value)} placeholder="Referensi dokumen / sumber" disabled={isMutating} />
            </div>
            <div className="flex justify-end gap-2 md:col-span-2">
              <Button type="button" variant="ghost" onClick={() => setCreating(false)}>Batal</Button>
              <Button type="submit" disabled={isMutating}>{isMutating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FileCheck2 className="h-4 w-4" aria-hidden="true" />}Daftarkan</Button>
            </div>
          </form>
        </SectionCard>
      ) : null}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ['Publisher', counts.total, Users],
          ['Terverifikasi', counts.verified, ShieldCheck],
          ['Menunggu', counts.pending, Clock3],
          ['Klaim aktif', counts.activeClaims, FileCheck2],
        ].map(([label, value, Icon]) => (
          <div key={String(label)} className="rounded-lg border border-hairline bg-bg-raised px-3 py-3">
            <div className="flex items-center gap-2 text-paper-faint"><Icon className="h-3.5 w-3.5" aria-hidden="true" /><span className="font-mono text-[10px] uppercase tracking-wider">{label}</span></div>
            <p className="mt-1 font-mono text-xl tabular-nums text-paper">{Number(value).toLocaleString('id-ID')}</p>
          </div>
        ))}
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
        <div className="min-w-0 rounded-lg border border-hairline bg-bg-raised">
          <div className="border-b border-hairline p-3">
            <form onSubmit={applySearch} className="flex flex-col gap-2 sm:flex-row">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-paper-faint" aria-hidden="true" />
                <Input aria-label="Cari publisher" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari publisher atau atribusi" className="pl-9" />
              </div>
              <DashboardSelect aria-label="Filter status publisher" value={status} onValueChange={(value) => setStatus((value ?? 'all') as typeof status)}>
                <DashboardSelectItem value="all">Semua status</DashboardSelectItem>
                <DashboardSelectItem value="verified">Terverifikasi</DashboardSelectItem>
                <DashboardSelectItem value="pending">Menunggu</DashboardSelectItem>
                <DashboardSelectItem value="unverified">Belum diverifikasi</DashboardSelectItem>
                <DashboardSelectItem value="rejected">Ditolak</DashboardSelectItem>
              </DashboardSelect>
              <Button type="submit" variant="outline" size="sm">Cari</Button>
            </form>
          </div>

          {visiblePublishers.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <p className="font-sans text-sm font-medium text-paper">Tidak ada publisher pada scope ini.</p>
              <p className="mt-1 font-sans text-xs text-paper-dim">Ubah filter atau daftar publisher baru.</p>
            </div>
          ) : (
            <div className="divide-y divide-hairline">
              {visiblePublishers.map((publisher) => {
                const meta = statusMeta(publisher.verificationStatus);
                const Icon = meta.icon;
                const claimCount = affiliations.filter((item) => item.publisherId === publisher.id).length;
                const activeClaimCount = affiliations.filter((item) => item.publisherId === publisher.id && item.active !== false).length;
                return (
                  <button
                    key={publisher.id}
                    type="button"
                    onClick={() => setSelectedId(publisher.id)}
                    className="flex w-full items-start gap-3 p-3 text-left transition hover:bg-bg-raised-2 focus:outline-none focus-visible:ring-1 focus-visible:ring-brass"
                    aria-pressed={selected?.id === publisher.id}
                  >
                    <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${meta.className}`} aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-sans text-sm font-medium text-paper">{publisher.name}</span>
                      <span className="mt-0.5 block truncate font-sans text-[11px] text-paper-dim">{publisher.attributionLabel ?? 'Tanpa label atribusi'} · {normalizeType(publisher.type)}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-mono text-[10px] text-paper-faint">{meta.label}</span>
                      <span className="block font-mono text-[10px] text-paper-dim">{activeClaimCount}/{claimCount} klaim aktif</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <aside className="min-w-0">
          {selected === null ? (
            <div className="rounded-lg border border-dashed border-hairline-strong p-8 text-center text-paper-dim">Pilih publisher untuk melihat detail governance.</div>
          ) : (
            <SectionCard icon={ShieldCheck} title={selected.name} eyebrow="Governance workspace">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 rounded-full border border-hairline px-2 py-1 font-mono text-[10px] ${statusMeta(selected.verificationStatus).className}`}>
                    {statusMeta(selected.verificationStatus).label}
                  </span>
                  <span className="rounded-full border border-hairline px-2 py-1 font-mono text-[10px] text-paper-dim">{normalizeType(selected.type)}</span>
                  <span className="font-mono text-[10px] text-paper-faint">v{selected.version}</span>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-md border border-hairline bg-bg px-3 py-2"><p className="font-mono text-[9px] uppercase tracking-wider text-paper-faint">Atribusi</p><p className="mt-1 truncate font-sans text-xs text-paper">{selected.attributionLabel ?? '—'}</p></div>
                  <div className="rounded-md border border-hairline bg-bg px-3 py-2"><p className="font-mono text-[9px] uppercase tracking-wider text-paper-faint">Bukti</p><p className="mt-1 truncate font-mono text-[10px] text-paper">{selected.evidenceReference ?? 'Belum ada referensi'}</p></div>
                </div>

                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-paper-faint">Klaim portal</p>
                  {selectedAffiliations.length === 0 ? (
                    <p className="mt-2 rounded-md border border-dashed border-hairline p-3 font-sans text-xs text-paper-dim">Belum ada klaim portal untuk publisher ini.</p>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {selectedAffiliations.slice(0, 8).map((claim) => (
                        <div key={claim.siteId + claim.institutionName} className="rounded-md border border-hairline bg-bg px-3 py-2">
                          <p className="truncate font-sans text-xs font-medium text-paper">{claim.institutionName}</p>
                          <p className="mt-0.5 font-mono text-[10px] text-paper-dim">{claim.cityName ?? 'Wilayah tidak diketahui'} · {claim.portalCount ?? 1} portal · {claim.active === false ? 'nonaktif' : 'aktif'}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {selectedAffiliations.length > 8 ? <p className="mt-2 font-mono text-[10px] text-paper-faint">+{selectedAffiliations.length - 8} klaim lain pada scope ini.</p> : null}
                </div>

                <div className="flex flex-wrap gap-2 border-t border-hairline pt-3">
                  {selected.verificationStatus === 'unverified' ? <Button type="button" size="sm" variant="outline" onClick={() => runDecision('publisher.submit')} disabled={isMutating}><FileCheck2 className="h-3.5 w-3.5" aria-hidden="true" />Kirim verifikasi</Button> : null}
                  {selected.verificationStatus === 'pending' ? <Button type="button" size="sm" onClick={() => runDecision('publisher.approve')} disabled={isMutating}><CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />Setujui</Button> : null}
                  {selected.verificationStatus === 'pending' ? <Button type="button" size="sm" variant="outline" onClick={() => runDecision('publisher.reject')} disabled={isMutating}><XCircle className="h-3.5 w-3.5" aria-hidden="true" />Tolak</Button> : null}
                  {selected.status === 'active' ? <Button type="button" size="sm" variant="ghost" onClick={() => runDecision('publisher.archive')} disabled={isMutating}><Archive className="h-3.5 w-3.5" aria-hidden="true" />Arsipkan</Button> : null}
                </div>

                <div className="border-t border-hairline pt-3">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-paper-faint">AI assist · opsional</p>
                  <AiPublisherVerify organizationId={organizationId} publisherName={selected.name} evidence={selected.evidenceReference ?? ''} />
                </div>
              </div>
            </SectionCard>
          )}
        </aside>
      </div>
    </section>
  );
}
