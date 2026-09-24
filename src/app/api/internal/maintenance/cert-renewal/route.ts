import { NextResponse } from 'next/server';

import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { resolveRequestId } from '@/core/observability/request-id';
import { withApiAccess } from '@/core/observability/api-access';
import { deliveryOperationsComposition } from '@/modules/delivery/delivery-operations-composition';
import { CertificateRenewalService } from '@/modules/delivery/certificate-renewal-service';
import { VercelExactDomainAdapter } from '@/integrations/vercel/exact-domain-adapter';
import { CloudflareAuthorityAdapter } from '@/integrations/cloudflare/cloudflare-authority';
import { authorized } from '@/app/api/internal/maintenance/view-flush/route';

async function handleGET(request: Request) {
  const requestId = resolveRequestId(request);
  const context = await getServerRuntimeContext();
  if (!authorized(request, context.config.security.cronSecret)) {
    return new NextResponse('Not Found', { status: 404, headers: { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' } });
  }
  const noStore = { 'Cache-Control': 'private, no-store' };
  const { config } = await deliveryOperationsComposition();
  const vercel = new VercelExactDomainAdapter(config.vercel.projectId, config.vercel.teamId, config.vercel.apiToken);
  const cloudflare = new CloudflareAuthorityAdapter(config.cloudflare.accountId, config.cloudflare.apiToken, config.vercel.productionTarget);
  const service = new CertificateRenewalService(vercel, cloudflare);
  const url = new URL(request.url);
  const limit = Math.max(1, Math.min(Number(url.searchParams.get('limit') ?? '3'), 10));
  const outcomes = await service.renewDue(limit);
  const renewed = outcomes.filter((outcome) => outcome.renewed).length;
  console.error(JSON.stringify({
    ts: new Date().toISOString(),
    level: renewed === outcomes.length ? 'info' : 'warn',
    service: 'indicate-web',
    event: 'cert-renewal.run',
    requestId,
    context: { outcomes },
  }));
  return NextResponse.json({ requestId, renewed, total: outcomes.length, outcomes }, { headers: noStore });
}

/**
 * Renews wildcard certificates expiring within 30 days via DNS challenges.
 *
 * @remarks Monthly cron scope (bounded per run, failures never block siblings).
 * Challenge TXT records are additive and left in place.
 */
export const GET = withApiAccess('GET /api/internal/maintenance/cert-renewal', handleGET);

export const maxDuration = 300;
