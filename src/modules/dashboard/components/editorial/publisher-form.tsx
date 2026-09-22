'use client';

import { useId, useRef, useTransition, type FormEvent } from 'react';
import {
  Check,
  Loader2,
  Plus,
  ShieldCheck,
} from 'lucide-react';
import { SectionCard } from '@/modules/dashboard/components/shared/section-card';
import { suggestAttributionLabel } from '@/modules/dashboard/components/editorial/publisher-attribution';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DashboardSelect, DashboardSelectItem } from '@/modules/dashboard/components/shared/dashboard-select';
import type { PublisherEntity, SiteEntity } from '@/modules/dashboard/components/shared/types';

const VERIFICATION_STATUS_LABELS: Readonly<Record<string, string>> = {
  unverified: 'Belum diverifikasi',
  pending: 'Menunggu verifikasi',
  verified: 'Terverifikasi',
  rejected: 'Ditolak',
};

export function PublisherForm({
  data,
  command,
}: {
  readonly data: unknown;
  readonly command: (action: string, payload: unknown) => Promise<unknown>;
}) {
  const model = data as {
    readonly publishers?: readonly PublisherEntity[];
    readonly sites?: readonly SiteEntity[];
  } | null;

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
  const lastSuggestedAttribution = useRef('');
  const createFormRef = useRef<HTMLFormElement | null>(null);

  const refreshAttributionSuggestion = (form: HTMLFormElement) => {
    const nameInput = form.elements.namedItem('name');
    const typeInput = form.elements.namedItem('type');
    const attributionInput = form.elements.namedItem('attributionLabel');
    if (
      !(nameInput instanceof HTMLInputElement) ||
      (!(typeInput instanceof HTMLSelectElement) && !(typeInput instanceof HTMLInputElement)) ||
      !(attributionInput instanceof HTMLInputElement)
    ) {
      return;
    }
    const current = attributionInput.value.trim();
    if (current !== '' && current !== lastSuggestedAttribution.current) {
      return;
    }
    const suggestion = suggestAttributionLabel(nameInput.value, typeInput.value);
    lastSuggestedAttribution.current = suggestion;
    attributionInput.value = suggestion;
  };

  const handleCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    startCreateTransition(async () => {
      await command('publisher.create', {
        name: String(formData.get('name') ?? '').trim(),
        type: formData.get('type'),
        attributionLabel: String(formData.get('attributionLabel') ?? '').trim(),
        contacts: {},
        evidenceReference: String(formData.get('evidenceReference') ?? '').trim() || null,
      });
      form.reset();
    });
  };

  const handleVerify = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const publisherId = String(formData.get('publisherId'));
    const publisher = model?.publishers?.find((p) => p.id === publisherId);

    if (!publisher) return;

    startVerifyTransition(async () => {
      await command(String(formData.get('decision')), {
        id: publisher.id,
        expectedVersion: publisher.version,
        evidenceReference: String(formData.get('evidenceReference') ?? '').trim() || undefined,
        reason: String(formData.get('reason') ?? '').trim() || undefined,
      });
      form.reset();
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <SectionCard icon={Plus} title="Penerbit baru" eyebrow="Registrasi">

        <form ref={createFormRef} onSubmit={handleCreate} className="space-y-3.5">
          <div className="space-y-1.5">
            <Label htmlFor={createNameId} className="font-mono text-xs text-paper-dim">
              Nama Resmi Media / Lembaga
            </Label>
            <Input
              id={createNameId}
              name="name"
              required
              disabled={isCreating}
              placeholder="cth: Radar Jawa Tengah Sentral"
              onBlur={(event) => {
                if (event.currentTarget.form !== null) refreshAttributionSuggestion(event.currentTarget.form);
              }}
              className="h-8 rounded border-hairline-strong bg-bg px-2.5 font-sans text-xs text-paper transition-colors duration-180 hover:border-hairline focus-visible:ring-brass"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={createTypeId} className="font-mono text-xs text-paper-dim">
              Jenis Penerbit
            </Label>
            <DashboardSelect
              id={createTypeId}
              name="type"
              disabled={isCreating}
              defaultValue="independent_publisher"
              placeholder="Pilih jenis penerbit"
              onValueChange={() => {
                const form = createFormRef.current;
                if (form !== null) refreshAttributionSuggestion(form);
              }}
            >
              <DashboardSelectItem value="independent_publisher">Penerbit Independen Regional</DashboardSelectItem>
              <DashboardSelectItem value="government_institution">Institusi / Lembaga Kedinasan</DashboardSelectItem>
              <DashboardSelectItem value="company">Badan Usaha / Korporasi Media</DashboardSelectItem>
            </DashboardSelect>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={createAttrId} className="font-mono text-xs text-paper-dim">
              Nama Tampil
            </Label>
            <Input
              id={createAttrId}
              name="attributionLabel"
              required
              disabled={isCreating}
              placeholder="cth: Redaksi Wonosobo News"
              className="h-8 rounded border-hairline-strong bg-bg px-2.5 font-sans text-xs text-paper transition-colors duration-180 hover:border-hairline focus-visible:ring-brass"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={createEvidenceId} className="font-mono text-xs text-paper-dim">
              Referensi Bukti Legalitas / Sertifikat (Opsional)
            </Label>
            <Input
              id={createEvidenceId}
              name="evidenceReference"
              disabled={isCreating}
              placeholder="cth: ref-dewanpers-2026-09"
              className="h-8 rounded border-hairline-strong bg-bg px-2.5 font-mono text-xs text-paper transition-colors duration-180 hover:border-hairline focus-visible:ring-brass"
            />
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="default"
              disabled={isCreating}
              className="w-full"
            >
              {isCreating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>Daftarkan Penerbit</span>
            </Button>
          </div>
        </form>
      </SectionCard>

      <SectionCard icon={ShieldCheck} title="Verifikasi & status" eyebrow="Tata kelola">

        <form onSubmit={handleVerify} className="space-y-3.5">
          <div className="space-y-1.5">
            <Label htmlFor={verifyPubId} className="font-mono text-xs text-paper-dim">
              Pilih Penerbit
            </Label>
            <DashboardSelect
              id={verifyPubId}
              name="publisherId"
              disabled={isVerifying}
              defaultValue={model?.publishers?.[0]?.id ?? ''}
              placeholder="Pilih penerbit"
            >
              {model?.publishers?.map((item) => (
                <DashboardSelectItem key={item.id} value={item.id}>
                  {item.name} · [{VERIFICATION_STATUS_LABELS[item.verificationStatus] ?? item.verificationStatus}]
                </DashboardSelectItem>
              ))}
            </DashboardSelect>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={verifyDecisionId} className="font-mono text-xs text-paper-dim">
              Keputusan
            </Label>
            <DashboardSelect
              id={verifyDecisionId}
              name="decision"
              disabled={isVerifying}
              defaultValue="publisher.submit"
              placeholder="Pilih keputusan"
            >
              <DashboardSelectItem value="publisher.submit">Kirim untuk Verifikasi</DashboardSelectItem>
              <DashboardSelectItem value="publisher.approve">Setujui & Verifikasi</DashboardSelectItem>
              <DashboardSelectItem value="publisher.reject">Tolak</DashboardSelectItem>
              <DashboardSelectItem value="publisher.archive">Arsipkan</DashboardSelectItem>
            </DashboardSelect>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={verifyEvidenceId} className="font-mono text-xs text-paper-dim">
              Bukti Pendukung
            </Label>
            <Input
              id={verifyEvidenceId}
              name="evidenceReference"
              disabled={isVerifying}
              placeholder="cth: audit-memo-jtw-001"
              className="h-8 rounded border-hairline-strong bg-bg px-2.5 font-mono text-xs text-paper transition-colors duration-180 hover:border-hairline focus-visible:ring-brass"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={verifyReasonId} className="font-mono text-xs text-paper-dim">
              Catatan / Alasan Penolakan
            </Label>
            <Input
              id={verifyReasonId}
              name="reason"
              disabled={isVerifying}
              placeholder="Wajib diisi bila memilih Tolak."
              className="h-8 rounded border-hairline-strong bg-bg px-2.5 font-sans text-xs text-paper transition-colors duration-180 hover:border-hairline focus-visible:ring-brass"
            />
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="outline"
              disabled={isVerifying}
              className="w-full"
            >
              {isVerifying ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Check className="h-3.5 w-3.5 text-brass" aria-hidden="true" />
              )}
              <span>Terapkan Keputusan</span>
            </Button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}