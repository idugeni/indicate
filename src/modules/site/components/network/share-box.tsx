'use client';

import { useState } from 'react';
import { Check, Link2, Share2 } from 'lucide-react';

/** Kotak bagikan: Web Share API bila ada, tautan WA/X/FB + salin bila tidak. */
export function ShareBox({ title }: { readonly title: string }) {
  const [copied, setCopied] = useState(false);

  const currentUrl = () => window.location.href;

  const nativeShare = async () => {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, url: currentUrl() });
      } catch {
        /* pengguna membatalkan — diam */
      }
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard diblokir — diam */
    }
  };

  const shareLinks = (url: string, text: string) => [
    { label: 'WhatsApp', href: `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}` },
    { label: 'X', href: `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}` },
    { label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
  ];

  return (
    <div className="rounded-lg border border-hairline bg-bg-raised p-5">
      <p className="m-0 flex items-center gap-2 font-sans text-sm font-semibold text-paper">
        <Share2 className="h-4 w-4 text-brass" aria-hidden="true" />
        Bagikan artikel
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {typeof navigator !== 'undefined' && typeof navigator.share === 'function' ? (
          <button
            type="button"
            onClick={() => void nativeShare()}
            className="inline-flex h-9 items-center bg-brass px-4 font-sans text-xs font-semibold text-bg transition-colors duration-180 hover:bg-brass-soft"
          >
            Bagikan
          </button>
        ) : (
          <ShareFallbackLinks title={title} links={shareLinks} />
        )}
        <button
          type="button"
          onClick={() => void copyLink()}
          className="inline-flex h-9 items-center gap-1.5 border border-hairline-strong px-3 font-sans text-xs text-paper transition-colors duration-180 hover:border-paper-faint"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-signal" aria-hidden="true" /> : <Link2 className="h-3.5 w-3.5" aria-hidden="true" />}
          <span>{copied ? 'Tersalin' : 'Salin tautan'}</span>
        </button>
      </div>
    </div>
  );
}

function ShareFallbackLinks({
  title,
  links,
}: {
  readonly title: string;
  readonly links: (url: string, text: string) => readonly { readonly label: string; readonly href: string }[];
}) {
  const [url, setUrl] = useState<string | null>(null);
  if (url === null) {
    return (
      <button
        type="button"
        onFocus={() => setUrl(window.location.href)}
        onMouseEnter={() => setUrl(window.location.href)}
        onClick={() => setUrl(window.location.href)}
        className="inline-flex h-9 items-center bg-brass px-4 font-sans text-xs font-semibold text-bg transition-colors duration-180 hover:bg-brass-soft"
      >
        Bagikan
      </button>
    );
  }
  return (
    <>
      {links(url, title).map((link) => (
        <a
          key={link.label}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 items-center bg-brass px-4 font-sans text-xs font-semibold text-bg transition-colors duration-180 hover:bg-brass-soft"
        >
          {link.label}
        </a>
      ))}
    </>
  );
}
