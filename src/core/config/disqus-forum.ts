/**
 * Resolve the Disqus forum shortname and build per-site thread identifiers.
 *
 * @remarks One forum serves the whole network, so the shortname is platform
 * configuration rather than per-tenant data, and thread identity has to carry
 * the site. The shortname shape itself lives in the Disqus contract so the boot
 * schema and the browser agree on what a forum label is.
 */
import { DISQUS_SHORTNAME_PATTERN } from '@/core/security/disqus-contract';

/**
 * Resolve the network Disqus forum shortname.
 *
 * @param environment - Process environment map; defaults to `process.env`.
 * @returns Trimmed shortname when it is a valid forum label; otherwise `undefined`.
 * @remarks Public by design, exactly like the Google verification token: it is
 * rendered into a `<script src>` on every reader page, so it is validated for
 * shape and never treated as a secret. An absent value disables comments on
 * every site regardless of its own switch.
 */
export function resolveDisqusShortname(
  environment: Record<string, string | undefined> = process.env,
): string | undefined {
  const raw = environment.NEXT_PUBLIC_DISQUS_SHORTNAME?.trim() ?? '';
  return DISQUS_SHORTNAME_PATTERN.test(raw) ? raw : undefined;
}

/**
 * Build the Disqus thread identifier for one article on one site.
 *
 * @param siteId - Site the thread belongs to.
 * @param articleId - Canonical article identity, shared across every destination.
 * @returns Identifier of the form `<siteId>:<articleId>`.
 * @remarks Disqus keys a thread by shortname plus identifier, and the network
 * runs one shortname. A bare `articleId` would therefore merge the discussion
 * of every portal carrying that article into a single thread, so readers of one
 * tenant brand would see the comments left on another. The `siteId` prefix is
 * what keeps those threads apart; it is deliberately not derivable from the
 * hostname, since a site can change domain while its threads must not.
 *
 * Both arguments must be colon-free, which every `uuid` column satisfies; a
 * colon in either would let two different pairs produce the same identifier.
 */
export function disqusThreadIdentifier(siteId: string, articleId: string): string {
  return `${siteId}:${articleId}`;
}

/**
 * Map a site locale to a Disqus language code.
 *
 * @param locale - BCP 47 site locale such as `id-ID`; may be null.
 * @returns Lowercase primary subtag such as `id`, or null when there is no locale.
 * @remarks Disqus selects its interface from this code and falls back to English
 * for one it does not know, so passing the primary subtag is never worse than
 * omitting it. The code is not verified against a Disqus language list: a wrong
 * guess costs an English interface, whereas a stale allowlist would silently
 * pin a locale that Disqus has since renamed.
 */
export function disqusLanguage(locale: string | null | undefined): string | null {
  const primary = locale?.trim().toLowerCase().split('-')[0] ?? '';
  return /^[a-z]{2,3}$/u.test(primary) ? primary : null;
}