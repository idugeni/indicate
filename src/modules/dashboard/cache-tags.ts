import 'server-only';

/** Single cache-tag vocabulary; must match `planInvalidation()` tags so one revalidate fans out. */
export function orgTag(organizationId: string): string {
  return `org:${organizationId}`;
}
