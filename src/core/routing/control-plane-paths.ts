/** Control-plane-only paths; shared routing contract kept dependency-free so the proxy bundle never pulls React/`server-only`. */
export const SERVICE_PATHS: readonly string[] = Object.freeze([
  '/services',
  '/pricing',
  '/network',
  '/partners',
  '/about',
  '/faq',
  '/contact',
  '/privacy',
  '/terms',
]);

/** Exact or segment match, so tenant paths that merely share a prefix stay reachable. */
export function isServicePath(path: string): boolean {
  return SERVICE_PATHS.some((service) => path === service || path.startsWith(`${service}/`));
}
