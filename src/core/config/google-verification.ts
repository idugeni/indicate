/**
 * Resolve the Google Search Console HTML-tag verification token.
 *
 * @param environment - Process environment map; defaults to `process.env`.
 * @returns Trimmed token when it matches the Search Console format; otherwise `undefined`.
 * @remarks Dashboard host only. The token is public by design (rendered as
 * `<meta name="google-site-verification">`), so it is validated for shape,
 * never treated as a secret.
 */
export function resolveGoogleSiteVerification(
  environment: Record<string, string | undefined> = process.env,
): string | undefined {
  const raw = environment.GOOGLE_SITE_VERIFICATION?.trim() ?? '';
  if (/^[A-Za-z0-9_-]{8,128}$/.test(raw)) return raw;
  return undefined;
}
