import { SERVICE_PATHS } from '@/core/routing/control-plane-paths';

/** Render the control-plane sitemap document. */
export function controlPlaneSitemap(host: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const entries = ['/', ...SERVICE_PATHS.filter((path) => path !== '/status')]
    .map((path) => `  <url><loc>https://${host}${path}</loc><lastmod>${today}</lastmod></url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}
