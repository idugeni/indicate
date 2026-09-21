/** CSRF gate for cookie-authed mutations: SameSite=Lax keeps the OAuth callback working; fail-closed on cross-site/mismatched origin, unparsable values, and missing host as non-disclosing 404s. Header-getter core also serves Server Actions via `headers()`. */
export function denyCrossSiteHeaders(getHeader: (name: string) => string | null): boolean {
  const fetchSite = getHeader('sec-fetch-site');
  if (fetchSite !== null) {
    return fetchSite !== 'same-origin' && fetchSite !== 'same-site' && fetchSite !== 'none';
  }

  const host = getHeader('host')?.toLowerCase();
  if (host === undefined || host === '') return true;

  const origin = getHeader('origin');
  if (origin !== null) {
    try {
      return new URL(origin).host.toLowerCase() !== host;
    } catch {
      return true;
    }
  }

  const referer = getHeader('referer');
  if (referer !== null) {
    try {
      return new URL(referer).host.toLowerCase() !== host;
    } catch {
      return true;
    }
  }

  return false;
}

export function denyCrossSiteMutation(request: Request): boolean {
  return denyCrossSiteHeaders((name) => request.headers.get(name));
}
