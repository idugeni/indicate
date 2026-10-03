'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';

import type { NetworkSiteData } from '@/modules/delivery/models';

/**
 * Identity a listing card needs to ask Disqus about an article's thread.
 *
 * @remarks Supplied by the template shell rather than threaded through every
 * card: a card receives only `article`, and the 72 card components across the ten
 * templates have no site in scope. One provider per page beats editing all of
 * them, and it also keeps the tenant switch in a single place.
 */
export interface CommentTargetScope {
  readonly siteId: string;
  readonly origin: string;
}

const CommentTargetContext = createContext<CommentTargetScope | null>(null);

/**
 * Publish the requesting site's comment identity to every template surface.
 *
 * @remarks Resolves to null when the site has not opted in, which is the default
 * for every existing site. That single null is what keeps `count.js` off the
 * listing pages of a site that never enabled comments.
 */
export function CommentTargetProvider({
  site,
  children,
}: {
  readonly site: NetworkSiteData;
  readonly children: ReactNode;
}) {
  const scope = useMemo<CommentTargetScope | null>(
    () =>
      site.settings.commentsEnabled
        ? { siteId: site.context.siteId, origin: `https://${site.context.normalizedHostname}` }
        : null,
    [site.settings.commentsEnabled, site.context.siteId, site.context.normalizedHostname],
  );
  return <CommentTargetContext.Provider value={scope}>{children}</CommentTargetContext.Provider>;
}

/**
 * Read the requesting site's comment identity.
 *
 * @returns The scope when the site serves its own article pages and enabled comments; otherwise null.
 */
export function useCommentTargetScope(): CommentTargetScope | null {
  return useContext(CommentTargetContext);
}

/**
 * A card link this portal itself serves.
 *
 * @remarks Must be a single-slash-rooted path with no whitespace or backslash.
 * That rejects the absolute cross-host links a region or apex portal emits for a
 * descendant city's article, and it also rejects `//host/path` and backslash
 * forms, neither of which an `https?://` test would catch and both of which
 * would otherwise be pasted onto the wrong origin.
 */
const RELATIVE_HREF_PATTERN = /^\/(?!\/)[^\s\\]{1,2048}$/u;

/**
 * Decide whether a card can show a count that will match the page it links to.
 *
 * @param scope - Site comment identity, or null when comments are off.
 * @param href - Card link: host-relative for an article this portal owns, absolute when it points at another portal.
 * @returns Absolute thread URL, or null when the linked page is not served by this same site.
 * @remarks A region or apex portal lists its descendant cities' articles with an
 * absolute cross-host link, and the reader lands on the city portal — whose
 * thread is keyed by the city's site id, not this one's. Counting it here would
 * report a thread nobody will ever see, so those cards carry no count.
 */
export function resolveCommentTargetUrl(
  scope: CommentTargetScope | null,
  href: string,
): string | null {
  if (scope === null) return null;
  const target = href.trim();
  if (!RELATIVE_HREF_PATTERN.test(target)) return null;
  return `${scope.origin}${target}`;
}