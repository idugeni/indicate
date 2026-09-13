/** Brand-mark prosedural tenant: inisial di atas warna preset. Deterministik,
 * tanpa upload — dipakai sebagai logo/favicon fallback saat site_settings
 * belum punya logo_media_id / favicon_media_id. */

function sanitizeHex(value: unknown, fallback: string): string {
  if (typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value.trim())) {
    return value.trim();
  }
  return fallback;
}

function escapeXml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

export function renderBrandMarkSvg(input: {
  readonly name: string;
  readonly primary: string;
  readonly accent: string;
}): string {
  const initial = (input.name || 'P').trim().slice(0, 1).toUpperCase();
  const primary = sanitizeHex(input.primary, '#0b5d4b');
  const accent = sanitizeHex(input.accent, '#e9a23b');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" role="img" aria-label="${escapeXml(initial)}"><rect width="256" height="256" rx="40" fill="${primary}"/><rect x="10" y="10" width="236" height="236" rx="32" fill="none" stroke="${accent}" stroke-opacity="0.45" stroke-width="4"/><text x="128" y="172" text-anchor="middle" font-family="monospace" font-size="140" font-weight="bold" fill="${accent}">${escapeXml(initial)}</text></svg>`;
}
