import { LEGAL_ROUTES, SITE_ROUTES } from '@/ui/site/marketing-content';

/** Render the control-plane robots document. */
export const controlPlaneRobots = (host: string) => [
  'User-agent: *', 'Allow: /$',
  ...[...SITE_ROUTES, ...LEGAL_ROUTES].map((route) => `Allow: ${route.href}`),
  'Disallow: /dashboard', 'Disallow: /sign-in', 'Disallow: /auth', 'Disallow: /api/',
  'Disallow: /mcp', 'Disallow: /.webmcp/', 'Disallow: /cdn-cgi/', 'Disallow: /domain-pending',
  'Disallow: /categories', 'Disallow: /kebijakan-privasi', 'Disallow: /syarat-ketentuan',
  'Disallow: /tentang', 'Disallow: /kontak', 'Disallow: /search', 'Disallow: /rss.xml',
  `Sitemap: https://${host}/sitemap.xml`, '',
].join('\n');
