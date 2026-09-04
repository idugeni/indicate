const NO_STORE_HEADERS = {
  'X-Robots-Tag': 'noindex, nofollow',
  'Cache-Control': 'private, no-store',
} as const;

/** Non-indexable denial for machine routes (sitemap, feeds); never cached. */
export function denied(status: number): Response {
  return new Response('', { status, headers: { ...NO_STORE_HEADERS } });
}

/** Non-indexable denial that stays a valid robots.txt body. */
export function deniedRobotsTxt(status: number): Response {
  return new Response('User-agent: *\nDisallow: /\n', {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', ...NO_STORE_HEADERS },
  });
}
