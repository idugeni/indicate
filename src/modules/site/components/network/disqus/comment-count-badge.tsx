'use client';

import { useEffect } from 'react';
import { MessageSquare } from 'lucide-react';

import { disqusThreadIdentifier, resolveDisqusShortname } from '@/core/config/disqus-forum';
import { resolveCommentTargetUrl, useCommentTargetScope } from '@/modules/site/components/network/disqus/comment-target';
import { DISQUS_COUNT_CLASS, DISQUS_COUNT_SCRIPT_ID } from '@/core/security/disqus-contract';

interface DisqusCountWidgets {
  getCount(options?: { readonly reset?: boolean }): void;
}

declare global {
  interface Window {
    DISQUSWIDGETS?: DisqusCountWidgets;
  }
}

/**
 * Coalescing window for count repaints.
 *
 * @remarks A listing mounts one badge per card and each asks for a repaint, so
 * without a window the first paint would schedule a document-wide scan per card.
 */
const COUNT_RESET_DELAY_MS = 300;

/** Present only between appending `count.js` and its load event, so a mount during the fetch is not read as a stripped script. */
const COUNT_PENDING_ATTRIBUTE = 'data-disqus-count-pending';

let countResetTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleCountReset(): void {
  if (countResetTimer !== null) clearTimeout(countResetTimer);
  countResetTimer = setTimeout(() => {
    countResetTimer = null;
    window.DISQUSWIDGETS?.getCount({ reset: true });
  }, COUNT_RESET_DELAY_MS);
}

/**
 * Install `count.js` when it is missing and repaint the badges already in the DOM.
 *
 * @remarks Written instead of reusing `disqus-react`'s `CommentCount`, whose
 * `componentWillUnmount` deletes the shared script tag and clears
 * `DISQUSWIDGETS` on every single instance: one card leaving a listing would
 * blank the counts of every card still on it. Here the tag is installed only
 * when absent and is never torn down, and a repaint is coalesced across the
 * cards that mount together instead of being requested once per card.
 */
function ensureDisqusCountScript(shortname: string): void {
  if (typeof document === 'undefined') return;
  const existing = document.getElementById(DISQUS_COUNT_SCRIPT_ID);
  if (existing !== null) {
    if (existing.hasAttribute(COUNT_PENDING_ATTRIBUTE)) return;
    if (window.DISQUSWIDGETS !== undefined) {
      scheduleCountReset();
      return;
    }
    existing.remove();
  }
  const script = document.createElement('script');
  script.src = `https://${shortname}.disqus.com/count.js`;
  script.async = true;
  script.id = DISQUS_COUNT_SCRIPT_ID;
  script.setAttribute(COUNT_PENDING_ATTRIBUTE, 'true');
  script.addEventListener(
    'load',
    () => {
      script.removeAttribute(COUNT_PENDING_ATTRIBUTE);
      scheduleCountReset();
    },
    { once: true },
  );
  document.body.appendChild(script);
}

/**
 * Live comment count for one article on one site.
 *
 * @remarks Renders its children until `count.js` replaces them, which is what
 * holds the meta row's width while the number is still in flight.
 */
export function CommentCountBadge({
  siteId,
  articleId,
  url,
  className,
  children,
}: {
  readonly siteId: string;
  readonly articleId: string;
  readonly url: string;
  readonly className?: string | undefined;
  readonly children?: React.ReactNode;
}) {
  useEffect(() => {
    const shortname = resolveDisqusShortname();
    if (shortname === undefined) return;
    ensureDisqusCountScript(shortname);
  }, [siteId, articleId, url]);

  const classes = className === undefined ? DISQUS_COUNT_CLASS : `${DISQUS_COUNT_CLASS} ${className}`;
  return (
    <span
      className={classes}
      data-disqus-identifier={disqusThreadIdentifier(siteId, articleId)}
      data-disqus-url={url}
    >
      {children}
    </span>
  );
}

/**
 * Comment count for a card that only knows its article, resolved against the site in context.
 *
 * @remarks The boundary is here on purpose. `ArticleMeta` is a server component
 * rendered by every listing card, and reading the context from it would pull the
 * whole meta bar and its icons into the client bundle. Only the count crosses,
 * and only as three strings.
 *
 * The icon lives here rather than beside this call because whether a count
 * exists is decided inside the client: a server-side guard around the icon would
 * leave a bare glyph beside nothing on every card of a site that never enabled
 * comments. The placeholder child is what a fresh network shows on almost every
 * article, so the number arriving is not a visible change.
 */
export function CommentCountSlot({
  articleId,
  href,
  className,
  iconClassName,
}: {
  readonly articleId: string;
  readonly href: string;
  readonly className: string;
  /** Omitted by templates whose meta is a text run rather than an icon row. */
  readonly iconClassName?: string | undefined;
}) {
  const scope = useCommentTargetScope();
  const url = scope === null ? null : resolveCommentTargetUrl(scope, href);
  if (scope === null || url === null) return null;
  return (
    <span className={className}>
      {iconClassName === undefined ? null : <MessageSquare className={iconClassName} aria-hidden="true" />}
      <CommentCountBadge siteId={scope.siteId} articleId={articleId} url={url}>0</CommentCountBadge>
    </span>
  );
}