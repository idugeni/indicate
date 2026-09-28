'use client';

import { TurnstileChallenge } from '@/components/turnstile-challenge';
import { TemplateNotice } from '@/modules/site/components/network/ui/field';

function failureNotice(retry: () => void) {
  return (
    <TemplateNotice tone="error" title="Verifikasi keamanan gagal dimuat">
      Izinkan challenges.cloudflare.com atau nonaktifkan pemblokir iklan, lalu muat ulang verifikasi.
      <button
        type="button"
        onClick={retry}
        className="mt-2 inline-flex h-8 items-center rounded-full border border-[var(--tpl-ring,#e2e8f0)] px-3 font-sans text-xs font-bold text-[var(--tpl-muted,#475569)]"
      >
        Muat ulang verifikasi
      </button>
    </TemplateNotice>
  );
}

/**
 * Turnstile challenge for a tenant report form, themed like the surrounding fields.
 *
 * @param props.onToken - Receives the one-time token, or null when the widget expires or errors.
 * @param props.sitekey - Site key the tenant's domain record names, or null when the tenant has no widget yet.
 * @returns Nothing when no site key is configured, the widget, or a tenant-toned notice with a retry control when the script cannot load.
 * @remarks The submit button is deliberately not blocked while the challenge is pending: Cloudflare
 * issues a token in a fraction of a second on a healthy connection, so gating the button would turn a
 * blocked challenge script into a form nobody can submit. The server re-verifies the token on every
 * request, which is where an unverified submission is refused.
 */
export function ReportChallengeField({
  onToken,
  sitekey,
}: {
  readonly onToken: (token: string | null) => void;
  readonly sitekey: string | null;
}) {
  return (
    <div className="flex justify-center">
      <TurnstileChallenge onToken={onToken} sitekey={sitekey} fallback={failureNotice} />
    </div>
  );
}
