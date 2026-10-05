'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { DiscussionEmbed } from 'disqus-react';

import { disqusLanguage, disqusThreadIdentifier, resolveDisqusShortname } from '@/core/config/disqus-forum';

declare global {
  interface Window {
    DISQUS?: unknown;
  }
}

/**
 * How far ahead of the viewport the embed may start loading.
 *
 * @remarks The thread costs a third-party script and a framed document, which a
 * reader who never scrolls past the fold should not pay for. This margin is wide
 * enough that the iframe is normally painted by the time it is reached.
 */
const VISIBILITY_ROOT_MARGIN = '400px';

/**
 * Bound for the third-party thread before the loading copy admits failure.
 *
 * @remarks Without a bound a blocked `embed.js` (unregistered domain,
 * ad-blocker, offline) leaves "Memuat komentar…" on the page forever with no
 * way to tell a slow load from a dead one.
 */
const LOAD_TIMEOUT_MS = 20000;

/**
 * Chrome the thread brings to a template that does not override it.
 *
 * @remarks `border-current` is what lets one rule serve all ten templates: it
 * resolves to the text colour already in scope, so the divider matches a light
 * editorial page and a dark one alike instead of hard-coding a palette here.
 */
const THREAD_SECTION_CLASS = 'mt-10 border-t border-current/15 pt-8';

/**
 * Whether this browser cannot report viewport intersection at all.
 *
 * @remarks Read once during the first render rather than inside the effect. The
 * server answers `false` and renders the placeholder, which is also what every
 * current browser answers on its first render, so hydration matches; a browser
 * old enough to lack the observer starts with the embed already wanted, because
 * there is no intersection callback that could ever ask for it.
 */
function lacksIntersectionObserver(): boolean {
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
  const [nearViewport, setNearViewport] = useState(() => lacksIntersectionObserver());
  const [loadFailed, setLoadFailed] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

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

  useEffect(() => {
    if (!nearViewport || shortname === undefined || loadFailed) return;
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined' && window.DISQUS === undefined) setLoadFailed(true);
    }, LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [nearViewport, shortname, loadFailed, retryCount]);

  if (shortname === undefined) return null;

  const retry = () => {
    setLoadFailed(false);
    setRetryCount((count) => count + 1);
  };

  return (
    <section ref={hostRef} className={className ?? THREAD_SECTION_CLASS} aria-labelledby={headingId}>
      <h2 id={headingId} className="font-heading text-lg font-semibold">
        {heading}
      </h2>
      {nearViewport ? (
        loadFailed ? (
          <p className="mt-3 text-sm opacity-70">
            Komentar tidak dapat dimuat. Periksa koneksi atau pemblokir iklan, lalu{' '}
            <button type="button" onClick={retry} className="underline">
              coba lagi
            </button>
            .
          </p>
        ) : (
          // Warna eksplisit heksadesimal: Disqus mencicipi warna wadah untuk
          // mewarnai thread-nya, tetapi parsernya hanya paham rgb/heks/nama dan
          // melempar pada `lab()`/`oklch()` yang dihasilkan Tailwind v4 —
          // thread macet dengan iframe kosong. Wadah ini hanya menaungi skrip
          // Disqus; isi thread hidup di iframe terisolasi sehingga tampilan
          // situs tidak berubah.
          <div style={{ color: '#334155' }}>
            <DiscussionEmbed key={`${shortname}:${retryCount}`} shortname={shortname} config={config} />
          </div>
        )
      ) : (
        <p className="mt-3 text-sm opacity-70">Memuat komentar…</p>
      )}
    </section>
  );
}