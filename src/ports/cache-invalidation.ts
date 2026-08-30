export interface NextCacheInvalidationPort {
  revalidateTags(tags: readonly string[]): Promise<void>;
  revalidatePaths(paths: readonly string[]): Promise<void>;
}

export interface CacheCoordinationPort {
  incrementSiteVersion(organizationId: string, siteId: string): Promise<void>;
  setSiteBypass(organizationId: string, siteId: string, enabled: boolean): Promise<void>;
}
