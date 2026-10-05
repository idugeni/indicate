import 'server-only';

/** One catalog row considered by the model sweep. */
export interface SweepCatalogModel {
  readonly id: string;
  readonly providerId: string;
  readonly modelName: string;
  readonly taskRecommendation: string | null;
  readonly isActive: boolean;
}

/** Result of diffing the catalog against one provider listing. */
export interface SweepDiff {
  /** Active rows whose model id vanished from the provider listing. */
  readonly deactivate: readonly string[];
  /** Active rows kept (present in the listing or protected). */
  readonly kept: readonly string[];
}

/**
 * Provider listing identifiers that must never trigger auto-deactivation.
 *
 * @remarks Reserved for modalities served outside the standard model
 * directory (voice, transcription, embeddings): their absence from a
 * listing proves nothing about availability.
 */
const PROTECTED_TASKS: ReadonlySet<string> = new Set(['tts', 'speech synthesis', 'transcribe', 'transcription', 'embeddings']);

/**
 * Diff active catalog rows against a provider's live model listing.
 *
 * @param catalog - Catalog rows for one provider.
 * @param liveModelNames - Model ids from the provider's live listing.
 * @returns Row ids to deactivate; everything else is kept.
 */
export function diffCatalogModels(
  catalog: readonly SweepCatalogModel[],
  liveModelNames: ReadonlySet<string>,
): SweepDiff {
  const deactivate: string[] = [];
  const kept: string[] = [];
  for (const row of catalog) {
    if (!row.isActive) {
      kept.push(row.id);
      continue;
    }
    if (row.taskRecommendation !== null && PROTECTED_TASKS.has(row.taskRecommendation)) {
      kept.push(row.id);
      continue;
    }
    if (liveModelNames.has(row.modelName)) kept.push(row.id);
    else deactivate.push(row.id);
  }
  return { deactivate, kept };
}

/**
 * Normalize one provider listing entry to a bare model id.
 *
 * @param value - Raw entry (`{id}` object or plain string).
 * @returns Model id, or null when the entry carries none.
 */
export function normalizeListingId(value: unknown): string | null {
  if (typeof value === 'string') {
    const id = value.replace(/^models\//, '').trim();
    return id === '' ? null : id;
  }
  if (typeof value === 'object' && value !== null) {
    return normalizeListingId((value as Record<string, unknown>).id ?? (value as Record<string, unknown>).name);
  }
  return null;
}

/** One routing-policy model reference checked by the sweep. */
export interface SweepPolicyReference {
  readonly role: 'default' | 'fallback';
  readonly providerId: string;
  readonly modelName: string;
}

/**
 * Flag policy models that the catalog or live listings no longer support.
 *
 * @param refs - Default and fallback references from the armed policy.
 * @param catalog - Catalog rows for the referenced providers.
 * @param liveByProvider - Live model ids keyed by provider; providers
 * without a listing are skipped, never flagged.
 * @returns Human-readable warnings; empty when the chain resolves cleanly.
 * @remarks Read-only: the sweep never rewrites operator policy, it only
 * surfaces the dangle so the next cron or operator run repoints the chain
 * before requests start failing.
 */
export function findDanglingPolicyModels(
  refs: readonly SweepPolicyReference[],
  catalog: readonly SweepCatalogModel[],
  liveByProvider: ReadonlyMap<string, ReadonlySet<string>>,
): readonly string[] {
  const warnings: string[] = [];
  for (const ref of refs) {
    const row = catalog.find(
      (entry) => entry.providerId === ref.providerId && entry.modelName === ref.modelName,
    );
    if (row !== undefined && !row.isActive) {
      warnings.push(`${ref.role} model ${ref.providerId}/${ref.modelName} is inactive in catalog`);
      continue;
    }
    const live = liveByProvider.get(ref.providerId);
    if (live !== undefined && !live.has(ref.modelName)) {
      warnings.push(`${ref.role} model ${ref.providerId}/${ref.modelName} missing from live listing`);
    }
  }
  return warnings;
}
