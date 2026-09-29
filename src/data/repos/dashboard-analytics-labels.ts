export interface AnalyticsLabelInput {
  readonly siteLabelRows: readonly { id: string; name: string }[];
  readonly categoryLabelRows: readonly { id: string; name: string }[];
  readonly publisherLabelRows: readonly { id: string; name: string }[];
  readonly regionLabelRows: readonly { id: string; name: string }[];
  readonly siteViewRows: readonly { id: string; name: string }[];
  readonly articleViewRows: readonly { id: string; name: string }[];
  readonly bySite: readonly { key: string }[];
  readonly byCategory: readonly { key: string }[];
  readonly byPublisher: readonly { key: string }[];
  readonly byRegion: readonly { key: string }[];
  readonly outcomesBySite: readonly { key: string }[];
  readonly jobDimensions: readonly { siteId: string; regionId: string | null }[];
  readonly outcomeDimensions: readonly { siteId: string; regionId: string | null }[];
  readonly publisherFlows: readonly { penerbit: string; situs: string }[];
}

/**
 * Reduce tenant-wide label rows to the ids the analytics collections actually reference.
 *
 * @remarks A label map exists only to resolve a key that some chart displays, so a key
 * no collection emits needs no label. Without this, every analytics read shipped the
 * tenant's whole site directory — thousands of rows for a view that renders nothing.
 *
 * @param input - Tenant label rows paired with the collections that reference them.
 * @returns One map per dimension, each holding only the referenced ids.
 */
export function pruneAnalyticsLabels(input: AnalyticsLabelInput): {
  readonly siteLabels: Record<string, string>;
  readonly categoryLabels: Record<string, string>;
  readonly publisherLabels: Record<string, string>;
  readonly regionLabels: Record<string, string>;
  readonly articleLabels: Record<string, string>;
} {
  const siteIds = new Set<string>();
  const regionIds = new Set<string>();
  const addRegion = (regionId: string | null): void => {
    if (regionId !== null) regionIds.add(regionId);
  };
  for (const point of input.bySite) siteIds.add(point.key);
  for (const point of input.byRegion) regionIds.add(point.key);
  for (const point of input.outcomesBySite) {
    const separator = point.key.indexOf(':');
    if (separator > 0) siteIds.add(point.key.slice(0, separator));
  }
  for (const row of input.jobDimensions) { siteIds.add(row.siteId); addRegion(row.regionId); }
  for (const row of input.outcomeDimensions) { siteIds.add(row.siteId); addRegion(row.regionId); }
  for (const row of input.siteViewRows) siteIds.add(row.id);
  for (const flow of input.publisherFlows) siteIds.add(flow.situs);
  const pick = (rows: readonly { id: string; name: string }[], ids: ReadonlySet<string>): Record<string, string> => {
    const map: Record<string, string> = {};
    for (const row of rows) if (ids.has(row.id)) map[row.id] = row.name;
    return map;
  };
  const siteLabels = pick(input.siteLabelRows, siteIds);
  for (const row of input.siteViewRows) siteLabels[row.id] ??= row.name;
  return {
    siteLabels,
    categoryLabels: pick(input.categoryLabelRows, new Set(input.byCategory.map((point) => point.key))),
    publisherLabels: pick(
      input.publisherLabelRows,
      new Set([...input.byPublisher.map((point) => point.key), ...input.publisherFlows.map((flow) => flow.penerbit)]),
    ),
    regionLabels: pick(input.regionLabelRows, regionIds),
    articleLabels: pick(input.articleViewRows, new Set(input.articleViewRows.map((row) => row.id))),
  };
}
