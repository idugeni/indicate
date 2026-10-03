'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { DiscussionEmbed } from 'disqus-react';

import { disqusLanguage, disqusThreadIdentifier, resolveDisqusShortname } from '@/core/config/disqus-forum';

/**
 * How far ahead of the viewport the embed may start loading.
 *
 * @remarks The thread costs a third-party script and a framed document, which a
 * reader who never scrolls past the fold should not pay for. This margin is wide
 * enough that the iframe is normally painted by the time it is reached.
 */
const VISIBILITY_ROOT_MARGIN = '400px';

/**
 * Chrome the thread brings to a template that does not override it.
 *
 * @remarks `border-current` is what lets one rule serve all ten templates: it
 * resolves to the text colour already in scope, so the divider matches a light
 * editorial page and a dark one alike instead of hard-coding a palette here.
 */
const THREAD_SECTION_CLASS = 'mt-10 border-t border-current/15 pt-8';

/**
 * Whether this browser can report viewport intersection at all.
 *
 * @remarks Read once during the first render rather than inside the effect. The
 * server answers `false` and renders the placeholder, which is also what every
 * current browser answers on its first render, so hydration matches; a browser
 * old enough to lack the observer starts with the embed already wanted, because
 * there is no intersection callback that could ever ask for it.
 */
function canObserveIntersection(): boolean {
  return typeof window !== 'undefined' && typeof window.IntersectionObserver === 'undefined';
}

/**
 * Reader comment thread for one article on one site.
 *
 * @remarks Renders nothing at all when the platform has no forum configured, so
 * a deployment that never sets `NEXT_PUBLIC_DISQUS_SHORTNAME` carries no markup
 * for it. Whether a site shows a thread is the site setting's decision; this
 * component only resolves the forum and the thread identity.
 */
export function CommentThread({
  siteId,
  articleId,
  url,
  title,
  locale,
  className,
  heading = 'Komentar',
}: {
  readonly siteId: string;
  readonly articleId: string;
  readonly url: string;
  readonly title: string;
  readonly locale: string | null;
  readonly className?: string | undefined;
  readonly heading?: string | undefined;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const headingId = useId();
  const [nearViewport, setNearViewport] = useState(() => canObserveIntersection());

  useEffect(() => {
    const host = hostRef.current;
    if (host === null || nearViewport) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setNearViewport(true);
        observer.disconnect();
      },
      { rootMargin: VISIBILITY_ROOT_MARGIN },
    );
    observer.observe(host);
    return () => observer.disconnect();
  }, [nearViewport]);

  const shortname = resolveDisqusShortname();
  const config = useMemo(() => {
    const language = disqusLanguage(locale);
    return {
      url,
      identifier: disqusThreadIdentifier(siteId, articleId),
      title,
      ...(language === null ? {} : { language }),
    };
  }, [siteId, articleId, url, title, locale]);

  if (shortname === undefined) return null;

  return (
    <section ref={hostRef} className={className ?? THREAD_SECTION_CLASS} aria-labelledby={headingId}>
      <h2 id={headingId} className="font-heading text-lg font-semibold">
        {heading}
      </h2>
      {nearViewport ? (
        <DiscussionEmbed shortname={shortname} config={config} />
      ) : (
        <p className="mt-3 text-sm opacity-70">Memuat komentar…</p>
      )}
    </section>
  );
}