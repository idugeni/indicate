import 'server-only';

/** Redis key namespace; bumping the cache version repartitions every key. */
export function deriveRedisNamespace(environment: string, cacheVersion: number): string {
  return `indicate:${environment}:v${cacheVersion}`;
}

/**
 * Refuse to activate a runtime whose R2 roles claim the same bucket.
 *
 * @remarks The private media bucket arrives from the Postgres deployment
 * snapshot while the public and audit names arrive from the environment, so no
 * single source can reject an overlap on its own. A collision is silent at the
 * object level — every key still routes to a bucket the credential can write —
 * but naming the audit bucket as the private one would push media bytes into a
 * bucket whose lock is `Indefinite`, and the reconciler would only report the
 * keys afterwards. This is the one layer that sees all three names at once.
 *
 * @param buckets - Resolved bucket names; an unconfigured role is null.
 * @returns Nothing when each configured role holds a distinct name.
 * @throws {Error} When one bucket name is claimed by more than one role.
 */
export function assertDistinctR2Buckets(buckets: {
  readonly privateBucket: string;
  readonly publicBucket: string | null;
  readonly auditBucket: string | null;
}): void {
  const roles = [
    ['private', buckets.privateBucket],
    ['public', buckets.publicBucket],
    ['audit', buckets.auditBucket],
  ] as const;
  const claimedBy = new Map<string, string>();
  for (const [role, name] of roles) {
    if (name === null) continue;
    const holder = claimedBy.get(name);
    if (holder !== undefined) {
      throw new Error(`r2_bucket_role_conflict: "${name}" is configured as both ${holder} and ${role}`);
    }
    claimedBy.set(name, role);
  }
}
