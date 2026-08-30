import { createHash } from 'node:crypto';

import { normalizeConfiguredHostname } from '@/shared/hostname/normalize-configured-hostname';
import {
  MVP_REGION_DESCRIPTORS,
  type MvpSeedInput,
  type SeedRegionDescriptor,
  type SeedReport,
} from '@/domain/seed/mvp-seed';
import type { IdentifierGenerator } from '@/ports/identifier-generator';
import type { SeedRepository } from '@/ports/seed-repository';

export class SeedValidationError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(`Seed configuration is invalid: ${issues.join(', ')}`);
    this.name = 'SeedValidationError';
    this.issues = Object.freeze([...issues]);
  }
}

export class SeedExecutionError extends Error {
  readonly report: SeedReport;

  constructor(report: SeedReport) {
    super('Seed reconciliation failed and was rolled back.');
    this.name = 'SeedExecutionError';
    this.report = report;
  }
}

function validateRegions(regions: readonly SeedRegionDescriptor[]): readonly SeedRegionDescriptor[] {
  const issues: string[] = [];
  const externalKeys = new Set<string>();
  const slugs = new Set<string>();
  for (const region of regions) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(region.externalKey)) issues.push('region_external_key_invalid');
    if (!region.name.trim()) issues.push('region_name_required');
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(region.slug)) issues.push('region_slug_invalid');
    if (externalKeys.has(region.externalKey)) issues.push('region_external_key_duplicate');
    if (slugs.has(region.slug)) issues.push('region_slug_duplicate');
    externalKeys.add(region.externalKey);
    slugs.add(region.slug);
  }
  if (issues.length > 0) throw new SeedValidationError([...new Set(issues)].sort());
  return regions.map((region) => Object.freeze({ ...region }));
}

export function validateMvpSeedInput(input: MvpSeedInput): {
  readonly organizationId: string;
  readonly rootHostnames: readonly [string, string, string];
  readonly regions: readonly SeedRegionDescriptor[];
} {
  const issues: string[] = [];
  if (!input.organizationId) issues.push('organization_required');
  if (input.rootHostnames.length !== 3) issues.push('exactly_three_root_hosts_required');
  const normalized = input.rootHostnames.map((hostname) => normalizeConfiguredHostname(hostname));
  if (normalized.some((hostname) => hostname === null || !hostname.endsWith('.web.id'))) {
    issues.push('root_hostname_invalid');
  }
  const validHosts = normalized.filter((hostname): hostname is string => hostname !== null);
  if (new Set(validHosts).size !== validHosts.length) issues.push('root_hostname_duplicate');
  if (validHosts.some((hostname) => input.reservedHostnames.has(hostname))) issues.push('root_hostname_reserved');
  if (issues.length > 0) throw new SeedValidationError([...new Set(issues)].sort());
  const regions = validateRegions(input.regions ?? MVP_REGION_DESCRIPTORS);
  return Object.freeze({
    organizationId: input.organizationId,
    rootHostnames: Object.freeze(validHosts) as readonly [string, string, string],
    regions: Object.freeze(regions),
  });
}

export async function reconcileMvpSeed(
  input: MvpSeedInput,
  repository: SeedRepository,
  identifiers: IdentifierGenerator,
): Promise<SeedReport> {
  const validated = validateMvpSeedInput(input);
  const fingerprint = createHash('sha256').update(JSON.stringify({
    organizationId: validated.organizationId,
    rootHostnames: [...validated.rootHostnames].sort(),
    regions: [...validated.regions].sort((left, right) => left.externalKey.localeCompare(right.externalKey)),
  })).digest('hex');

  try {
    return await repository.transaction(validated.organizationId, async (transaction) => {
      const counts = { created: 0, updated: 0, unchanged: 0 };
      for (const normalizedHostname of validated.rootHostnames) {
        const outcome = await transaction.reconcileDomain({
          organizationId: validated.organizationId,
          id: identifiers.create(),
          normalizedHostname,
        });
        counts[outcome] += 1;
      }
      for (const region of validated.regions) {
        const outcome = await transaction.reconcileRegion({
          organizationId: validated.organizationId,
          id: identifiers.create(),
          ...region,
        });
        counts[outcome] += 1;
      }
      const runId = identifiers.create();
      await transaction.completeRun({
        organizationId: validated.organizationId,
        id: runId,
        fingerprint,
        ...counts,
      });
      return Object.freeze({ ...counts, failed: 0, fingerprint });
    });
  } catch (error) {
    if (error instanceof SeedValidationError) throw error;
    throw new SeedExecutionError(Object.freeze({
      created: 0,
      updated: 0,
      unchanged: 0,
      failed: 1,
      fingerprint,
    }));
  }
}
