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
import { Input } from '@/components/ui/input';
import type { PublisherEntity, SiteEntity } from '@/modules/dashboard/components/shared/types';

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

  const refreshAttributionSuggestion = (form: HTMLFormElement) => {
    const nameInput = form.elements.namedItem('name');
    const typeInput = form.elements.namedItem('type');
    const attributionInput = form.elements.namedItem('attributionLabel');
    if (
      !(nameInput instanceof HTMLInputElement) ||
      !(typeInput instanceof HTMLSelectElement) ||
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

        <form onSubmit={handleCreate} className="space-y-3.5">
          <div className="space-y-1.5">
            <label htmlFor={createNameId} className="font-mono text-xs text-paper-dim">
              Nama Resmi Media / Lembaga
            </label>
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
            <label htmlFor={createTypeId} className="font-mono text-xs text-paper-dim">
              Klasifikasi Entitas
            </label>
            <select
              id={createTypeId}
              name="type"
              disabled={isCreating}
              onChange={(event) => {
                if (event.currentTarget.form !== null) refreshAttributionSuggestion(event.currentTarget.form);
              }}
              className="h-8 w-full rounded border border-hairline-strong bg-bg px-2 font-mono text-xs text-paper transition-colors duration-180 hover:border-hairline focus:border-brass focus:outline-none"
            >
              <option value="independent_publisher">Penerbit Independen Regional</option>
              <option value="government_institution">Institusi / Lembaga Kedinasan</option>
              <option value="company">Badan Usaha / Korporasi Media</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor={createAttrId} className="font-mono text-xs text-paper-dim">
              Label Atribusi Kanonikal
            </label>
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
            <label htmlFor={createEvidenceId} className="font-mono text-xs text-paper-dim">
              Referensi Bukti Legalitas / Sertifikat (Opsional)
            </label>
            <Input
              id={createEvidenceId}
              name="evidenceReference"
              disabled={isCreating}
              placeholder="cth: ref-dewanpers-2026-09"
              className="h-8 rounded border-hairline-strong bg-bg px-2.5 font-mono text-xs text-paper transition-colors duration-180 hover:border-hairline focus-visible:ring-brass"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isCreating}
              className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded bg-brass px-3.5 font-sans text-xs font-semibold text-bg transition-colors duration-180 hover:bg-brass-soft disabled:opacity-50"
            >
              {isCreating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>Daftarkan Penerbit</span>
            </button>
          </div>
        </form>
      </SectionCard>

      <SectionCard icon={ShieldCheck} title="Verifikasi & status" eyebrow="Tata kelola">

        <form onSubmit={handleVerify} className="space-y-3.5">
          <div className="space-y-1.5">
            <label htmlFor={verifyPubId} className="font-mono text-xs text-paper-dim">
              Pilih Target Penerbit
            </label>
            <select
              id={verifyPubId}
              name="publisherId"
              disabled={isVerifying}
              className="h-8 w-full rounded border border-hairline-strong bg-bg px-2 font-mono text-xs text-paper transition-colors duration-180 hover:border-hairline focus:border-brass focus:outline-none"
            >
              {model?.publishers?.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · [{item.verificationStatus}]
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor={verifyDecisionId} className="font-mono text-xs text-paper-dim">
              Keputusan Redaksi (Action)
            </label>
            <select
              id={verifyDecisionId}
              name="decision"
              disabled={isVerifying}
              className="h-8 w-full rounded border border-hairline-strong bg-bg px-2 font-mono text-xs text-paper transition-colors duration-180 hover:border-hairline focus:border-brass focus:outline-none"
            >
              <option value="publisher.submit">Submit (Kirim ke Antrean Audit)</option>
              <option value="publisher.approve">Approve (Verifikasi & Setujui)</option>
              <option value="publisher.reject">Reject (Tolak Otorisasi)</option>
              <option value="publisher.archive">Archive (Arsipkan / Bekukan)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor={verifyEvidenceId} className="font-mono text-xs text-paper-dim">
              Dokumen Rujukan Audit
            </label>
            <Input
              id={verifyEvidenceId}
              name="evidenceReference"
              disabled={isVerifying}
              placeholder="cth: audit-memo-jtw-001"
              className="h-8 rounded border-hairline-strong bg-bg px-2.5 font-mono text-xs text-paper transition-colors duration-180 hover:border-hairline focus-visible:ring-brass"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor={verifyReasonId} className="font-mono text-xs text-paper-dim">
              Catatan Evaluasi / Alasan Penolakan
            </label>
            <Input
              id={verifyReasonId}
              name="reason"
              disabled={isVerifying}
              placeholder="Wajib diisi jika status penolakan dipilih..."
              className="h-8 rounded border-hairline-strong bg-bg px-2.5 font-sans text-xs text-paper transition-colors duration-180 hover:border-hairline focus-visible:ring-brass"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isVerifying}
              className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded border border-hairline-strong bg-bg px-3.5 font-sans text-xs font-semibold text-paper transition-colors duration-180 hover:border-hairline hover:bg-bg-raised-2 disabled:opacity-50"
            >
              {isVerifying ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Check className="h-3.5 w-3.5 text-brass" aria-hidden="true" />
              )}
              <span>Terapkan Resolusi Status</span>
            </button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}