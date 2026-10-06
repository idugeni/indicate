'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { DiscussionEmbed } from 'disqus-react';

import { disqusLanguage, disqusThreadIdentifier, resolveDisqusShortname } from '@/core/config/disqus-forum';
import { CommentCountBadge } from '@/modules/site/components/network/disqus/comment-count-badge';

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
 * server answers `false` and renders the collapsed prompt, which is also what
 * every current browser answers on its first render, so hydration matches.
 * The thread still waits for an explicit click even when the observer is
 * missing; the flag only skips waiting for the intersection callback.
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
 * component only resolves the forum and the thread identity. The heavy
 * third-party embed stays unmounted behind a `Tampilkan komentar` prompt until
 * the reader asks for it, so the initial page carries no Disqus iframe cost.
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
  const threadId = useId();
  const [nearViewport, setNearViewport] = useState(() => lacksIntersectionObserver());
  const [expanded, setExpanded] = useState(false);
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
    if (!expanded || !nearViewport || shortname === undefined || loadFailed) return;
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined' && window.DISQUS === undefined) setLoadFailed(true);
    }, LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [expanded, nearViewport, shortname, loadFailed, retryCount]);

  if (shortname === undefined) return null;

  const expand = () => {
    setExpanded(true);
    setNearViewport(true);
  };

  const retry = () => {
    setLoadFailed(false);
    setRetryCount((count) => count + 1);
  };

  return (
    <section ref={hostRef} className={`${className ?? THREAD_SECTION_CLASS} cv-auto`} aria-labelledby={headingId}>
      <h2 id={headingId} className="flex flex-wrap items-baseline gap-x-2 font-heading text-lg font-semibold">
        {heading}
        <CommentCountBadge
          siteId={siteId}
          articleId={articleId}
          url={url}
          className="font-sans text-sm font-normal tabular-nums opacity-70"
        />
      </h2>
      {/*
       * Kartu terang: thread Disqus selalu terang (skema terang terdeteksi dari
       * warna wadah), jadi kartu putih berradius menjaga kontras di semua
       * template termasuk yang gelap. Warna eksplisit heksadesimal: Disqus
       * mencicipi warna wadah untuk mewarnai thread-nya, tetapi parsernya
       * hanya paham rgb/heks/nama dan melempar pada `lab()`/`oklch()` yang
       * dihasilkan Tailwind v4 — thread macet dengan iframe kosong. Wadah ini
       * hanya menaungi skrip Disqus; isi thread hidup di iframe terisolasi
       * sehingga tampilan situs tidak berubah.
       */}
      <div style={{ color: '#334155' }} className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      {!expanded ? (
        <div>
          <p className="m-0 text-sm opacity-70">Diskusi pembaca dimuat hanya bila diminta agar halaman tetap ringan.</p>
          <button
            type="button"
            onClick={expand}
            aria-expanded="false"
            aria-controls={threadId}
            className="mt-3 inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-900"
          >
            Tampilkan komentar
          </button>
        </div>
      ) : nearViewport ? (
        loadFailed ? (
          <p className="m-0 text-sm opacity-70">
            Komentar tidak dapat dimuat. Periksa koneksi atau pemblokir iklan, lalu{' '}
            <button type="button" onClick={retry} className="underline">
              coba lagi
            </button>
            .
          </p>
        ) : (
          <div id={threadId}>
            <DiscussionEmbed key={`${shortname}:${retryCount}`} shortname={shortname} config={config} />
          </div>
        )
      ) : (
        <p className="m-0 text-sm opacity-70">Memuat komentar…</p>
      )}
      </div>
    </section>
  );
}