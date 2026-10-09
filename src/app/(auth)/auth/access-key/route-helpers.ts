const VIEW_DESTINATIONS: ReadonlySet<string> = new Set([
  'dashboard','configuration','publishers','editorial','taxonomy','articles','media','publishing','published','ads','analytics','audit','operations','settings','customers','content','billing','moderation','ai',
]);

export function resolveAccessKeyDestination(to: string | null): string {
  if (to !== null && VIEW_DESTINATIONS.has(to)) return `/dashboard?view=${to}`;
  return '/dashboard?view=editorial';
}

