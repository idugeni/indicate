import 'server-only';

import { cache } from 'react';
import { unstable_cache } from 'next/cache';

import type { ControlSurface, RequestClassification, ResolvedSiteContext } from '@/modules/delivery/models';
import type { DeliveryRepository } from '@/modules/delivery/ports';
import { normalizeRequestHostname } from '@/core/hostname/normalize-request-hostname';

export interface ControlPlaneHosts {
  readonly dashboard: string;
  readonly api: string;
  readonly webhook: string;
}

const CLASSIFY_REVALIDATE_SECONDS = 300;

type SiteLookup = Pick<DeliveryRepository, 'findActiveSitesByExactHostname'>;

const lookupPerRequest = cache(
  async (repository: SiteLookup, hostname: string): Promise<readonly ResolvedSiteContext[]> => {
    const cached = unstable_cache(
      async (): Promise<readonly ResolvedSiteContext[]> => repository.findActiveSitesByExactHostname(hostname),
      ['hostname-classify', hostname],
      { tags: [`host:${hostname}`], revalidate: CLASSIFY_REVALIDATE_SECONDS },
    );
    return cached();
  },
);

/**
 * Resolve request hostnames into control, site, or error classifications.
 *
 * @remarks Host deployment milik project ini (localhost + *.vercel.app) dipetakan ke dashboard. Pertahanan lapis kedua bila rewrite header di proxy terlewat (pembaca hilir mengutamakan x-forwarded-host yang di Vercel selalu berisi host asli deployment). Host asing lain tetap unknown → 404.
 */
export class HostnameResolver {
  private readonly controls: ReadonlyMap<string, ControlSurface>;
  constructor(private readonly repository: Pick<DeliveryRepository, 'findActiveSitesByExactHostname'>, hosts: ControlPlaneHosts) {
    this.controls = new Map([[hosts.dashboard, 'dashboard'], [hosts.api, 'api'], [hosts.webhook, 'webhook']]);
  }

  async classify(rawHost: string | null | undefined): Promise<RequestClassification> {
    const normalized = normalizeRequestHostname(rawHost);
    if (!normalized.ok) return { kind: 'invalid', status: 400, robots: 'noindex, nofollow' };
    let hostname = normalized.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.vercel.app')) {
      const dashboardHost = Array.from(this.controls.entries()).find(([, surface]) => surface === 'dashboard')?.[0];
      if (dashboardHost !== undefined) hostname = dashboardHost;
    }
    const surface = this.controls.get(hostname);
    if (surface !== undefined) return { kind: 'control', hostname, surface };
    const matches = await lookupPerRequest(this.repository, hostname);
    if (matches.length === 0) return { kind: 'unknown', hostname, status: 404, robots: 'noindex, nofollow' };
    if (matches.length !== 1) return { kind: 'ambiguous', hostname, status: 500, robots: 'noindex, nofollow' };
    return { kind: 'site', context: matches[0]! };
  }
}

export function hasReservedHostnameConflict(hostname: string, controls: ReadonlySet<string>): boolean {
  const normalized = normalizeRequestHostname(hostname);
  return normalized.ok && controls.has(normalized.hostname);
}
