'use client';

import Link from 'next/link';

import { TemplateCheckbox } from '@/modules/site/components/network/ui/field';

/**
 * Terms and privacy consent for a tenant report form.
 *
 * @param props.checked - Whether the reader has ticked the box.
 * @param props.onCheckedChange - Receives the new tick state.
 * @param props.disabled - Freeze the box while the report is in flight.
 * @returns Tenant-toned checkbox labelled with the two tenant legal documents.
 * @remarks A content report is the one thing a reader hands this platform that
 * identifies them, so the tenant has to be able to say the reader was told where
 * their contact goes. The label wraps the control rather than pointing at it, which
 * is the only association Base UI's span-plus-hidden-input checkbox answers to;
 * the links inside it stay independently clickable because a label does not
 * activate through an interactive descendant.
 */
export function ReportConsentField({
  checked,
  onCheckedChange,
  disabled = false,
}: {
  readonly checked: boolean;
  readonly onCheckedChange: (checked: boolean) => void;
  readonly disabled?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 font-sans text-xs leading-relaxed text-[var(--tpl-muted,#475569)]">
      <TemplateCheckbox
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className="mt-0.5"
      />
      <span>
        Saya menyatakan laporan ini jujur dan blokuster Anda, serta menyetujui{' '}
        <Link
          href="/syarat-ketentuan"
          className="font-semibold text-[var(--tpl-primary,#1a5fd0)] hover:underline"
        >
          Syarat &amp; Ketentuan
        </Link>{' '}
        dan{' '}
        <Link
          href="/kebijakan-privasi"
          className="font-semibold text-[var(--tpl-primary,#1a5fd0)] hover:underline"
        >
          Kebijakan Privasi
        </Link>{' '}
        atas pemrosesan data kontak saya.
      </span>
    </label>
  );
}
