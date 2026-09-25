export interface PublisherEntity {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly attributionLabel: string;
  readonly contacts?: Record<string, string>;
  readonly evidenceReference: string | null;
  readonly version: number;
  readonly verificationStatus: string;
  readonly status?: string;
}

export interface SiteEntity {
  readonly id: string;
  readonly normalizedHostname: string;
  readonly domainId?: string;
  readonly regionId?: string | null;
  readonly version?: number;
  readonly status?: string;
}

export interface RegionEntity {
  readonly id: string;
  readonly name: string;
  readonly slug?: string;
  readonly externalKey?: string;
  readonly version?: number;
  readonly status?: string;
  readonly kind?: string;
  readonly parentRegionId?: string | null;
}

export interface CategoryEntity {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly status: string;
  readonly version: number;
}

export interface AuthorEntity {
  readonly id: string;
  readonly displayName: string;
  readonly byline: string;
  readonly status: string;
  readonly version: number;
}

export interface ArticleEntity {
  readonly id: string;
  readonly regionId: string;
  readonly publisherId: string | null;
  readonly categoryId: string | null;
  readonly authorId: string | null;
  readonly slug: string;
  readonly title: string;
  readonly body: string;
  readonly source: string;
  /** Normalized topic tags; absent in projections that omit them. */
  readonly tags?: readonly string[];
  readonly version: number;
  readonly status: string;
  readonly scheduledAt?: string | null;
}

export interface DomainEntity {
  readonly id: string;
  readonly normalizedHostname: string;
  readonly version: number;
  readonly status: string;
}