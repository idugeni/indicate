import { createHash } from 'node:crypto';

import {
  MVP_REGION_DESCRIPTORS,
  type ReadinessRegionFixture,
  type ReadinessRootFixture,
  type ReadinessSiteFixture,
  type Stage7FixtureConfig,
  type Stage7ReadinessFixture,
} from './models';

function stableUuid(scope: string): string {
  const hex = createHash('sha256').update(`indicate-stage7:${scope}`).digest('hex').slice(0, 32).split('');
  hex[12] = '4';
  hex[16] = ['8', '9', 'a', 'b'][Number.parseInt(hex[16] ?? '0', 16) % 4] ?? '8';
  const value = hex.join('');
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

function assertExactlyThreeDistinctRoots(roots: readonly string[]): asserts roots is readonly [string, string, string] {
  if (roots.length !== 3 || new Set(roots).size !== 3 || roots.some((root) => root.length === 0)) {
    throw new Error('stage7_requires_exactly_three_distinct_roots');
  }
}

export function createStage7ReadinessFixture(config: Stage7FixtureConfig): Stage7ReadinessFixture {
  const roots = [...config.hosts.mvpRoots];
  assertExactlyThreeDistinctRoots(roots);
  if (roots.some((root) => config.hosts.reserved.has(root))) throw new Error('stage7_root_conflicts_with_control_plane');

  const rootFixtures = roots.map((normalizedHostname, index): ReadinessRootFixture => {
    const organizationId = stableUuid(`organization:${normalizedHostname}`);
    const domainId = stableUuid(`domain:${normalizedHostname}`);
    const regions = MVP_REGION_DESCRIPTORS.map((region) => Object.freeze({
      ...region,
      id: stableUuid(`region:${organizationId}:${region.externalKey}`),
    })) as unknown as [ReadinessRegionFixture, ReadinessRegionFixture, ReadinessRegionFixture];
    const apexSite: ReadinessSiteFixture = Object.freeze({
      id: stableUuid(`site:${normalizedHostname}`),
      organizationId,
      domainId,
      regionId: null,
      normalizedHostname,
      kind: 'apex',
    });
    const regionalSites = regions.map((region): ReadinessSiteFixture => Object.freeze({
      id: stableUuid(`site:${region.slug}.${normalizedHostname}`),
      organizationId,
      domainId,
      regionId: region.id,
      normalizedHostname: `${region.slug}.${normalizedHostname}`,
      kind: 'regional',
    }));
    return Object.freeze({
      ordinal: (index + 1) as 1 | 2 | 3,
      organizationId,
      domainId,
      normalizedHostname,
      apexSite,
      regions,
      regionalSites: Object.freeze(regionalSites),
    });
  }) as [ReadinessRootFixture, ReadinessRootFixture, ReadinessRootFixture];

  const regions = Object.freeze(rootFixtures.flatMap((root) => root.regions));
  const regionalMatrix = Object.freeze(rootFixtures.flatMap((root) => root.regionalSites));
  const allSites = Object.freeze(rootFixtures.flatMap((root) => [root.apexSite, ...root.regionalSites]));
  if (regions.length !== 9 || new Set(regions.map(({ id }) => id)).size !== 9
    || regionalMatrix.length !== 9 || allSites.length !== 12) throw new Error('stage7_fixture_cardinality_invalid');

  return Object.freeze({
    roots: Object.freeze(rootFixtures),
    regions: Object.freeze(regions),
    regionalMatrix,
    allSites,
  });
}
