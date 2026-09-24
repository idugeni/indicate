import type { CloudflareAuthorityPort } from '@/integrations/cloudflare/ports';
import type { VercelHostingPort } from '@/integrations/vercel/ports';

export interface CertRenewalOutcome {
  readonly apex: string;
  readonly renewed: boolean;
  readonly reason: string;
}

/**
 * Renews expiring wildcard certificates through DNS challenges.
 *
 * @remarks Monthly cron scope: renews only `*.apex` certs expiring within
 * 30 days (bounded per run). Challenge TXT records are additive and left in
 * place; a failed apex never blocks the next one. All provider calls are
 * free-tier API operations — no metered Vercel cost.
 */
export class CertificateRenewalService {
  constructor(
    private readonly vercel: VercelHostingPort,
    private readonly cloudflare: CloudflareAuthorityPort,
    private readonly renewBeforeMs: number = 30 * 24 * 60 * 60 * 1000,
    private readonly challengeWaitMs: number = 75_000,
    private readonly sleep: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    private readonly now: () => number = Date.now,
  ) {}

  async renewDue(limit = 3): Promise<readonly CertRenewalOutcome[]> {
    const certs = await this.vercel.listWildcardCerts();
    const due = certs.filter(
      (cert) => cert.expiresAt - this.now() < this.renewBeforeMs && cert.cns.some((cn) => cn.startsWith('*.')),
    );
    const outcomes: CertRenewalOutcome[] = [];
    for (const cert of due.slice(0, Math.max(0, limit))) {
      const wildcard = cert.cns.find((cn) => cn.startsWith('*.')) ?? '';
      const apex = wildcard.slice(2);
      try {
        const challenges = await this.vercel.startWildcardCertOrder([wildcard]);
        if (challenges.length === 0) {
          outcomes.push({ apex, renewed: false, reason: 'no-challenge' });
          continue;
        }
        for (const challenge of challenges) {
          await this.cloudflare.ensureExactVerificationTxt(apex, `_acme-challenge.${apex}`, challenge.value);
        }
        await this.sleep(this.challengeWaitMs);
        await this.vercel.finalizeWildcardCertOrder([wildcard]);
        outcomes.push({ apex, renewed: true, reason: 'issued' });
      } catch (error) {
        outcomes.push({ apex, renewed: false, reason: error instanceof Error ? error.message.slice(0, 120) : 'unknown' });
      }
    }
    return outcomes;
  }
}
