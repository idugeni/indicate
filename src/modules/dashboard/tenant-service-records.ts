import { createHash } from 'node:crypto';

import type { RoleListItem, RoleRecord } from '@/modules/dashboard/models';
import { DashboardAccessDeniedError, DashboardConflictError } from '@/modules/dashboard/ports';
import { DashboardValidationError } from '@/modules/dashboard/tenant-service-errors';
import { validateTipTapDoc } from '@/modules/site/tiptap-document';

export function requireRecord<T extends { readonly id: string }>(values: readonly T[], id: string): T {
  const value = values.find((candidate) => candidate.id === id);
  if (value === undefined) throw new DashboardAccessDeniedError();
  return value;
}

export function requireVersion<T extends { readonly version: number }>(value: T, expected: number): void {
  if (value.version !== expected) throw new DashboardConflictError();
}

export function changedFields(before: Readonly<Record<string, unknown>>, after: Readonly<Record<string, unknown>>): readonly string[] {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys].filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key])).sort();
}

export function publicRecord(value: object): Readonly<Record<string, unknown>> {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !['createdAt', 'updatedAt'].includes(key)));
}

/**
 * Pin a portal assignment set without dumping it.
 *
 * @remarks An article can be assigned to every portal in the network, so the
 * id list runs to thousands of entries and a full `before` plus `after` pair
 * costs hundreds of kilobytes per audit row — bytes the daily WORM export
 * mirrors verbatim, once per write, for a payload that repeated almost exactly
 * across every write of the same article. The count plus a digest over the
 * sorted ids still pins the exact set, so a verifier can prove what the set was
 * at that point in the chain, while the ids that actually moved travel once in
 * the delta.
 *
 * @param siteIds - Assigned site ids, already deduplicated and sorted.
 * @returns Size and SHA-256 digest of the newline-joined ids.
 */
export function assignmentDigest(siteIds: readonly string[]): { readonly siteCount: number; readonly siteIdsSha256: string } {
  return { siteCount: siteIds.length, siteIdsSha256: createHash('sha256').update(siteIds.join('\n')).digest('hex') };
}

export function roleJson(role: RoleRecord): RoleListItem {
  return { ...role, permissions: [...role.permissions] };
}

export function defined<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T;
}

export function replaceById<T extends { readonly id: string }>(values: T[], next: T): void {
  const index = values.findIndex(({ id }) => id === next.id);
  if (index < 0) throw new DashboardAccessDeniedError();
  values[index] = next;
}

export function requireValidBodyJson(value: unknown): Record<string, unknown> | null {
  if (value === undefined || value === null) return null;
  const result = validateTipTapDoc(value);
  if (!result.ok) throw new DashboardValidationError({ bodyJson: [`Dokumen teks kaya tidak valid (${result.reason}).`] });
  return result.doc as unknown as Record<string, unknown>;
}

export function normalizeHostnameCandidate(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/gu, '');
}

export function requirePublisherNameAvailable(
  state: { readonly sites: readonly { readonly normalizedHostname: string }[]; readonly domains: readonly { readonly normalizedHostname: string }[] },
  name: string,
): void {
  const folded = normalizeHostnameCandidate(name);
  if (folded === '') return;
  const matches = (hostname: string): boolean => {
    const clean = hostname.toLowerCase().trim();
    if (normalizeHostnameCandidate(clean) === folded) return true;
    return false;
  };
  const domainLabels = state.domains.map((domain) => domain.normalizedHostname.toLowerCase().trim().split('.')[0] ?? '');
  if (state.sites.some((site) => matches(site.normalizedHostname)) || state.domains.some((domain) => matches(domain.normalizedHostname)) || domainLabels.some((label) => label !== '' && normalizeHostnameCandidate(label) === folded)) {
    throw new DashboardValidationError({ name: ['Nama menyerupai domain/situs tenant; gunakan nama institusi resmi.'] });
  }
}
