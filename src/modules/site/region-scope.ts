/** Geography facts the scope predicate needs, matching the `regions` table. */
export interface ScopeGeography {
  readonly id: string;
  readonly kind: 'region' | 'city';
  readonly parentRegionId: string | null;
}

/**
 * Decide whether a region-scoped actor may act on a geography.
 *
 * This mirrors `indicate_private.region_scope_covers` exactly so the dashboard
 * and row-level security never disagree about who is in scope.
 *
 * @param scope - The actor's region scope, or null when unrestricted.
 * @param candidate - Geography the actor wants to act on; null for an apex portal.
 * @param geography - Tenant geographies, used to resolve the candidate's parent.
 * @returns True when the candidate is inside the scope.
 * @remarks An unrestricted actor covers everything and an apex portal is always
 * visible, matching the existing policy. A region scope additionally covers the
 * cities underneath it, which is what makes regional editorial work on city
 * portals possible. Nothing widens further: a sibling city, another province,
 * and a parent province all stay denied, and the organization is always checked
 * separately by the caller.
 */
export function regionScopeCovers(
  scope: string | null,
  candidate: string | null,
  geography: readonly ScopeGeography[],
): boolean {
  if (scope === null || candidate === null) return true;
  if (candidate === scope) return true;
  return geography.some((node) => node.id === candidate && node.parentRegionId === scope);
}
