export interface SeedDomainRecord {
  readonly id: string;
  readonly organizationId: string;
  readonly normalizedHostname: string;
  readonly status: 'inactive';
}

export interface SeedRegionDescriptor {
  readonly externalKey: string;
  readonly name: string;
  readonly slug: string;
}

export interface SeedRegionRecord extends SeedRegionDescriptor {
  readonly id: string;
  readonly organizationId: string;
  readonly status: 'active';
}

export const MVP_REGION_DESCRIPTORS: readonly SeedRegionDescriptor[] = Object.freeze([
  Object.freeze({ externalKey: 'central-java-wonosobo', name: 'Wonosobo', slug: 'wonosobo' }),
  Object.freeze({ externalKey: 'central-java-magelang', name: 'Magelang', slug: 'magelang' }),
  Object.freeze({ externalKey: 'central-java-semarang', name: 'Semarang', slug: 'semarang' }),
]);

export interface MvpSeedInput {
  readonly organizationId: string;
  readonly rootHostnames: readonly string[];
  readonly reservedHostnames: ReadonlySet<string>;
  readonly regions?: readonly SeedRegionDescriptor[];
}

export interface SeedReport {
  readonly created: number;
  readonly updated: number;
  readonly unchanged: number;
  readonly failed: number;
  readonly fingerprint: string;
}

export type SeedReconcileOutcome = 'created' | 'updated' | 'unchanged';
