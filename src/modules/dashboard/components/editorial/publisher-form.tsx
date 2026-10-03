'use client';

import {
  useId,
  useMemo,
  useState,
  useTransition,
  type FormEvent,
} from 'react';
import { toast } from 'sonner';
import {
  Check,
  CheckCircle2,
  Clock3,
  Loader2,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { SectionCard } from '@/modules/dashboard/components/shared/section-card';
import { SearchCombobox } from '@/modules/dashboard/components/shared/search-combobox';
import { suggestAttributionLabel } from '@/modules/dashboard/components/editorial/publisher-attribution';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AiPublisherVerify } from '@/modules/ai/components/ai-publisher-verify';
import { DashboardSelect, DashboardSelectItem } from '@/modules/dashboard/components/shared/dashboard-select';
import type { PublisherEntity } from '@/modules/dashboard/components/shared/types';
import type { DashboardCommand } from '@/modules/dashboard/command';

interface PublisherFormProps {
  readonly data: unknown;
  readonly command: DashboardCommand;
  readonly organizationId?: string | undefined;
}

interface PublisherContainerModel {
  readonly publishers?: readonly PublisherEntity[];
}

const VERIFICATION_STATUS_META: Readonly<
  Record<
    string,
    {
      readonly label: string;
      readonly icon: typeof CheckCircle2;
      readonly badgeClassName: string;
    }
  >
> = {
  unverified: {
    label: 'Belum diverifikasi',
    icon: Clock3,
    badgeClassName: 'border-hairline-strong bg-bg text-paper-dim',
  },
  pending: {
    label: 'Menunggu verifikasi',
    icon: Clock3,
    badgeClassName: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  },
  verified: {
    label: 'Terverifikasi',
    icon: CheckCircle2,
    badgeClassName: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  },
  rejected: {
    label: 'Ditolak',
    icon: XCircle,
    badgeClassName: 'border-rose-500/30 bg-rose-500/10 text-rose-400',
  },
};

const FALLBACK_VERIFICATION_META = {
  label: 'Belum diverifikasi',
  icon: Clock3,
  badgeClassName: 'border-hairline-strong bg-bg text-paper-dim',
};

export function PublisherForm({
  data,
  command,
  organizationId,
}: PublisherFormProps) {
  const publishers = useMemo(
    () => (data as PublisherContainerModel | null)?.publishers ?? [],
    [data],
  );

  const createNameId = useId();
  const createTypeId = useId();
  const createAttrId = useId();
  const createEvidenceId = useId();

  const verifyPubId = useId();
  const verifyDecisionId = useId();
  const verifyEvidenceId = useId();
  const verifyReasonId = useId();

  const [isCreating, startCreateTransition] = useTransition();
  const [isVerifying, startVerifyTransition] = useTransition();

  const [createName, setCreateName] = useState('');
  const [createType, setCreateType] = useState('independent_publisher');
  const [createAttribution, setCreateAttribution] = useState('');
  const [createEvidence, setCreateEvidence] = useState('');

  const [verifyPublisherId, setVerifyPublisherId] = useState('');
  const [verifyDecision, setVerifyDecision] = useState('publisher.submit');
  const [verifyEvidence, setVerifyEvidence] = useState('');
  const [verifyReason, setVerifyReason] = useState('');

  const activePublisher = useMemo(() => {
    if (publishers.length === 0) return null;
    return (
      publishers.find((item) => item.id === verifyPublisherId) ??
      publishers[0] ??
      null
    );
  }, [publishers, verifyPublisherId]);

  const publisherOptions = useMemo(() => {
    return publishers.map((item) => {
      const statusLabel =
        VERIFICATION_STATUS_META[item.verificationStatus]?.label ??
        item.verificationStatus;
      return {
        value: item.id,
        label: `${item.name} (${statusLabel})`,
      };
    });
  }, [publishers]);

  const activeStatusMeta =
    (activePublisher
      ? VERIFICATION_STATUS_META[activePublisher.verificationStatus]
      : undefined) ??
    VERIFICATION_STATUS_META.unverified ??
    FALLBACK_VERIFICATION_META;

  const ActiveStatusIcon = activeStatusMeta.icon;

  const handleApplySuggestion = () => {
    if (createName.trim() === '') {
      toast.info('Ketik nama resmi media terlebih dahulu untuk membuat saran.');
      return;
    }
    const suggestion = suggestAttributionLabel(createName, createType);
    setCreateAttribution(suggestion);
  };

  const handleAssessmentReason = (recommendation: string) => {
    const trimmed = recommendation.trim();
    if (trimmed === '') return;

    if (verifyReason.trim() === '') {
      setVerifyReason(trimmed.slice(0, 300));
      toast.info('Rekomendasi AI diterapkan ke catatan keputusan.');
    }
  };

  const handleCreateSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanName = createName.trim();
    const cleanAttr = createAttribution.trim();

    if (cleanName === '') {
      toast.error('Nama resmi penerbit wajib diisi.');
      return;
    }

    if (cleanAttr === '') {
      toast.error('Label atribusi tampilan wajib diisi.');
      return;
    }

    startCreateTransition(async () => {
      try {
        await command('publisher.create', {
          name: cleanName,
          type: createType,
          attributionLabel: cleanAttr,
          contacts: {},
          evidenceReference: createEvidence.trim() || null,
        }, { refresh: true });

        toast.success(`Penerbit ${cleanName} berhasil didaftarkan.`);
        setCreateName('');
        setCreateAttribution('');
        setCreateEvidence('');
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Gagal mendaftarkan penerbit baru.';
        toast.error(message);
      }
    });
  };

  const handleVerifySubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!activePublisher) {
      toast.error('Pilih penerbit target terlebih dahulu.');
      return;
    }

    const cleanReason = verifyReason.trim();
    if (verifyDecision === 'publisher.reject' && cleanReason === '') {
      toast.error('Catatan alasan wajib diisi saat menolak penerbit.');
      return;
    }

    startVerifyTransition(async () => {
      try {
        await command(verifyDecision, {
          id: activePublisher.id,
          expectedVersion: activePublisher.version,
          evidenceReference: verifyEvidence.trim() || undefined,
          reason: cleanReason || undefined,
        }, { refresh: true });

        toast.success('Keputusan tata kelola berhasil diterapkan.');
        setVerifyReason('');
        setVerifyEvidence('');
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Gagal memproses keputusan verifikasi.';
        toast.error(message);
      }
    });
  };

  return (
    <div className="grid items-start gap-5 md:grid-cols-2">
      <SectionCard
        icon={Plus}
        title="Penerbit Baru"
        eyebrow="Registrasi Entitas"
      >
        <form
          noValidate
          onSubmit={handleCreateSubmit}
          className="flex flex-col gap-4"
        >
          <div className="space-y-1.5">
            <Label
              htmlFor={createNameId}
              className="font-mono text-xs uppercase tracking-wider text-paper-dim"
            >
              Nama Resmi Media / Lembaga
            </Label>
            <Input
              id={createNameId}
              name="name"
              required
              disabled={isCreating}
              value={createName}
              onChange={(event) => setCreateName(event.target.value)}
              onBlur={() => {
                if (createAttribution.trim() === '' && createName.trim() !== '') {
                  setCreateAttribution(suggestAttributionLabel(createName, createType));
                }
              }}
              placeholder="cth: Radar Jawa Tengah Sentral"
              className="h-9 rounded-md border-hairline-strong bg-bg px-3 font-sans text-xs text-paper transition duration-150 placeholder:text-paper-dim/50 hover:border-hairline focus-visible:ring-1 focus-visible:ring-brass"
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor={createTypeId}
              className="font-mono text-xs uppercase tracking-wider text-paper-dim"
            >
              Klasifikasi Penerbit
            </Label>
            <DashboardSelect
              id={createTypeId}
              name="type"
              disabled={isCreating}
              defaultValue="independent_publisher"
              value={createType}
              placeholder="Pilih jenis penerbit"
              onValueChange={(val) => {
                const nextType = val ?? 'independent_publisher';
                setCreateType(nextType);
                if (createName.trim() !== '') {
                  setCreateAttribution(suggestAttributionLabel(createName, nextType));
                }
              }}
            >
              <DashboardSelectItem value="independent_publisher">
                Penerbit Independen Regional
              </DashboardSelectItem>
              <DashboardSelectItem value="government_institution">
                Institusi / Lembaga Kedinasan
              </DashboardSelectItem>
              <DashboardSelectItem value="company">
                Badan Usaha / Korporasi Media
              </DashboardSelectItem>
            </DashboardSelect>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label
                htmlFor={createAttrId}
                className="font-mono text-xs uppercase tracking-wider text-paper-dim"
              >
                Nama Tampil & Atribusi
              </Label>
              <button
                type="button"
                onClick={handleApplySuggestion}
                disabled={isCreating || createName.trim() === ''}
                className="inline-flex items-center gap-1 font-mono text-[11px] text-brass transition hover:underline disabled:pointer-events-none disabled:opacity-40"
              >
                <Sparkles className="h-3 w-3" />
                <span>Format Otomatis</span>
              </button>
            </div>
            <Input
              id={createAttrId}
              name="attributionLabel"
              required
              disabled={isCreating}
              value={createAttribution}
              onChange={(event) => setCreateAttribution(event.target.value)}
              placeholder="cth: Redaksi Radar Jateng Sentral"
              className="h-9 rounded-md border-hairline-strong bg-bg px-3 font-sans text-xs text-paper transition duration-150 placeholder:text-paper-dim/50 hover:border-hairline focus-visible:ring-1 focus-visible:ring-brass"
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor={createEvidenceId}
              className="font-mono text-xs uppercase tracking-wider text-paper-dim"
            >
              Referensi Bukti Legalitas
            </Label>
            <Input
              id={createEvidenceId}
              name="evidenceReference"
              disabled={isCreating}
              value={createEvidence}
              onChange={(event) => setCreateEvidence(event.target.value)}
              placeholder="cth: ref-dewanpers-2026-09"
              className="h-9 rounded-md border-hairline-strong bg-bg px-3 font-mono text-xs text-paper transition duration-150 placeholder:text-paper-dim/50 hover:border-hairline focus-visible:ring-1 focus-visible:ring-brass"
            />
          </div>

          <Button
            type="submit"
            disabled={isCreating}
            className="mt-2 w-full gap-2 text-xs font-medium"
          >
            {isCreating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            <span>Daftarkan Penerbit</span>
          </Button>
        </form>
      </SectionCard>

      <SectionCard
        icon={ShieldCheck}
        title="Verifikasi & Status"
        eyebrow="Tata Kelola Entitas"
      >
        <form
          noValidate
          onSubmit={handleVerifySubmit}
          className="flex flex-col gap-4"
        >
          <div className="space-y-1.5">
            <Label
              htmlFor={verifyPubId}
              className="font-mono text-xs uppercase tracking-wider text-paper-dim"
            >
              Penerbit Target
            </Label>
            <SearchCombobox
              id={verifyPubId}
              name="publisherId"
              disabled={isVerifying}
              defaultValue={activePublisher?.id ?? ''}
              onValueChange={(next) => setVerifyPublisherId(next ?? '')}
              placeholder="Cari atau pilih penerbit..."
              options={publisherOptions}
            />
          </div>

          {activePublisher && (
            <div className="flex items-center justify-between rounded-md border border-hairline-strong bg-bg/60 p-2.5">
              <div className="min-w-0 pr-2">
                <p className="truncate font-sans text-xs font-medium text-paper">
                  {activePublisher.name}
                </p>
                <p className="font-mono text-[10px] text-paper-dim">
                  ID: {activePublisher.id.slice(0, 12)}... · Versi {activePublisher.version}
                </p>
              </div>
              <div
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] ${activeStatusMeta.badgeClassName}`}
              >
                <ActiveStatusIcon className="h-3 w-3" />
                <span>{activeStatusMeta.label}</span>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label
              htmlFor={verifyDecisionId}
              className="font-mono text-xs uppercase tracking-wider text-paper-dim"
            >
              Keputusan Tata Kelola
            </Label>
            <DashboardSelect
              id={verifyDecisionId}
              name="decision"
              disabled={isVerifying}
              defaultValue="publisher.submit"
              value={verifyDecision}
              placeholder="Pilih keputusan verifikasi"
              onValueChange={(val) => setVerifyDecision(val ?? 'publisher.submit')}
            >
              <DashboardSelectItem value="publisher.submit">
                Kirim untuk Verifikasi
              </DashboardSelectItem>
              <DashboardSelectItem value="publisher.approve">
                Setujui & Terbitkan Status Resmi
              </DashboardSelectItem>
              <DashboardSelectItem value="publisher.reject">
                Tolak Pengajuan
              </DashboardSelectItem>
              <DashboardSelectItem value="publisher.archive">
                Arsipkan Entitas
              </DashboardSelectItem>
            </DashboardSelect>
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor={verifyEvidenceId}
              className="font-mono text-xs uppercase tracking-wider text-paper-dim"
            >
              Dokumen Audit / Bukti Pendukung
            </Label>
            <Input
              id={verifyEvidenceId}
              name="evidenceReference"
              disabled={isVerifying}
              value={verifyEvidence}
              onChange={(event) => setVerifyEvidence(event.target.value)}
              placeholder="cth: audit-memo-jtw-001"
              className="h-9 rounded-md border-hairline-strong bg-bg px-3 font-mono text-xs text-paper transition duration-150 placeholder:text-paper-dim/50 hover:border-hairline focus-visible:ring-1 focus-visible:ring-brass"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label
                htmlFor={verifyReasonId}
                className="font-mono text-xs uppercase tracking-wider text-paper-dim"
              >
                Catatan Evaluasi / Alasan Penolakan
              </Label>
              <span className="font-mono text-[10px] text-paper-dim">
                {verifyReason.length}/300
              </span>
            </div>
            <Input
              id={verifyReasonId}
              name="reason"
              maxLength={300}
              disabled={isVerifying}
              value={verifyReason}
              onChange={(event) => setVerifyReason(event.target.value)}
              placeholder={
                verifyDecision === 'publisher.reject'
                  ? 'Alasan wajib disertakan untuk keputusan penolakan'
                  : 'Catatan tambahan peninjauan audit'
              }
              className={`h-9 rounded-md border-hairline-strong bg-bg px-3 font-sans text-xs text-paper transition duration-150 placeholder:text-paper-dim/50 hover:border-hairline focus-visible:ring-1 focus-visible:ring-brass ${
                verifyDecision === 'publisher.reject' && verifyReason.trim() === ''
                  ? 'border-rose-500/40'
                  : ''
              }`}
            />
          </div>

          <Button
            type="submit"
            variant="outline"
            disabled={isVerifying}
            className="mt-2 w-full gap-2 text-xs font-medium"
          >
            {isVerifying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : verifyDecision === 'publisher.reject' ? (
              <ShieldAlert className="h-4 w-4 text-rose-400" />
            ) : (
              <Check className="h-4 w-4 text-brass" />
            )}
            <span>Terapkan Keputusan</span>
          </Button>
        </form>

        <div className="mt-5 border-t border-hairline pt-4">
          <AiPublisherVerify
            organizationId={organizationId}
            publisherName={activePublisher?.name ?? ''}
            evidence={verifyEvidence}
            onAssessment={(assessment) => handleAssessmentReason(assessment.recommendation)}
          />
        </div>
      </SectionCard>
    </div>
  );
}