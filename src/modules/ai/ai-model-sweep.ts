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
