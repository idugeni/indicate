/** CSRF gate for cookie-authenticated mutations. Require same-origin Fetch Metadata when present; otherwise require an exact Origin or Referer host match. Missing origin signals fail closed. */
export function denyCrossSiteHeaders(getHeader: (name: string) => string | null): boolean {
  const fetchSite = getHeader('sec-fetch-site');
  if (fetchSite !== null) return fetchSite !== 'same-origin';

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

  return true;
}

export function denyCrossSiteMutation(request: Request): boolean {
  return denyCrossSiteHeaders((name) => request.headers.get(name));
}
