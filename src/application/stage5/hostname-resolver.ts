import type { ControlSurface, RequestClassification } from '@/domain/stage5/models';
import type { Stage5Repository } from '@/ports/stage5-repository';
import { normalizeRequestHostname } from '@/shared/hostname/normalize-request-hostname';

export interface ControlPlaneHosts {
  readonly cms: string;
  readonly api: string;
  readonly webhook: string;
}

export class HostnameResolver {
  private readonly controls: ReadonlyMap<string, ControlSurface>;
  constructor(private readonly repository: Pick<Stage5Repository, 'findActiveSitesByExactHostname'>, hosts: ControlPlaneHosts) {
    this.controls = new Map([[hosts.cms, 'cms'], [hosts.api, 'api'], [hosts.webhook, 'webhook']]);
  }

  async classify(rawHost: string | null | undefined): Promise<RequestClassification> {
    const normalized = normalizeRequestHostname(rawHost);
    if (!normalized.ok) return { kind: 'invalid', status: 400, robots: 'noindex, nofollow' };
    const surface = this.controls.get(normalized.hostname);
    if (surface !== undefined) return { kind: 'control', hostname: normalized.hostname, surface };
    const matches = await this.repository.findActiveSitesByExactHostname(normalized.hostname);
    if (matches.length === 0) return { kind: 'unknown', hostname: normalized.hostname, status: 404, robots: 'noindex, nofollow' };
    if (matches.length !== 1) return { kind: 'ambiguous', hostname: normalized.hostname, status: 500, robots: 'noindex, nofollow' };
    return { kind: 'site', context: matches[0]! };
  }
}

export function hasReservedHostnameConflict(hostname: string, controls: ReadonlySet<string>): boolean {
  const normalized = normalizeRequestHostname(hostname);
  return normalized.ok && controls.has(normalized.hostname);
}
