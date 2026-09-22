/**
 * Single suggestion option with a submitted id and a visible label.
 */
export interface LabeledOption {
  readonly value: string;
  readonly label: string;
}

/**
 * Normalize a suggestion query for matching and cache keys.
 *
 * @param query - Raw input text.
 * @returns Trimmed lowercase query.
 */
export function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

/**
 * Filter labeled options by substring match on label, then value.
 *
 * @param options - Full option list.
 * @param query - Raw input text; empty matches everything.
 * @param limit - Maximum options returned; defaults to 50.
 * @returns Matching options in original order, capped at the limit.
 */
export function filterLabeledOptions(
  options: readonly LabeledOption[],
  query: string,
  limit = 50,
): readonly LabeledOption[] {
  const needle = normalizeQuery(query);
  if (needle === '') return options.slice(0, limit);
  const matched = options.filter(
    (option) =>
      option.label.toLowerCase().includes(needle) || option.value.toLowerCase().includes(needle),
  );
  return matched.slice(0, limit);
}

/**
 * Rank distinct tags by usage frequency, then alphabetically.
 *
 * @param articles - Articles carrying optional tag lists.
 * @param limit - Maximum tags returned; defaults to 50.
 * @returns Tags ordered most-used first.
 */
export function rankTags(
  articles: readonly { readonly tags?: readonly string[] | null }[],
  limit = 50,
): readonly string[] {
  const counts = new Map<string, number>();
  for (const article of articles) {
    for (const tag of article.tags ?? []) {
      const clean = tag.trim();
      if (clean === '') continue;
      counts.set(clean, (counts.get(clean) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([tag]) => tag);
}

/**
 * Bounded memo cache for derived suggestions.
 *
 * @param limit - Maximum cached entries; oldest evicted first.
 * @returns Cache with key-scoped compute-once lookup.
 */
export function createSuggestionCache<T>(limit = 50): {
  get(key: string, compute: () => T): T;
  clear(): void;
  readonly size: number;
} {
  const entries = new Map<string, T>();
  return {
    get(key: string, compute: () => T): T {
      const hit = entries.get(key);
      if (hit !== undefined) return hit;
      const fresh = compute();
      entries.set(key, fresh);
      while (entries.size > limit) {
        const oldest = entries.keys().next();
        if (oldest.done) break;
        entries.delete(oldest.value);
      }
      return fresh;
    },
    clear(): void {
      entries.clear();
    },
    get size(): number {
      return entries.size;
    },
  };
}
