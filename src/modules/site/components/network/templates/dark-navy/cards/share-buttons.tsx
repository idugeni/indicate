'use client';

import { useState } from 'react';
import { Check, Link2, Mail } from 'lucide-react';
import { FaFacebookF, FaTelegram, FaWhatsapp, FaXTwitter } from 'react-icons/fa6';

import type { NetworkArticle } from '@/modules/delivery/models';

/**
 * Barisan tombol bagikan: WhatsApp, X, Facebook, Telegram, Email,
 * dan salin tautan (clipboard + status tersalin).
 */
export function DarkNavyShareButtons({ article, canonical }: { readonly article: NetworkArticle; readonly canonical: string }) {
  const [copied, setCopied] = useState(false);
  const shareText = encodeURIComponent(`${article.title} ${canonical}`);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(canonical);
    } catch {
      const area = document.createElement('textarea');
      area.value = canonical;
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      document.body.removeChild(area);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const round =
    'flex h-9 w-9 items-center justify-center rounded-full text-[#9aa9c4] ring-1 ring-[#1b2c4f] transition-colors hover:text-[#2f7bff]';

  return (
    <p className="m-0 flex flex-none flex-wrap items-center gap-2" aria-label="Bagikan artikel">
      <a
        href={`https://wa.me/?text=${shareText}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Bagikan ke WhatsApp"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2f7bff] text-white transition-colors hover:bg-[#1a5fd0]"
      >
        <FaWhatsapp className="h-4 w-4" aria-hidden="true" />
      </a>
      <a
        href={`https://x.com/intent/post?text=${shareText}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Bagikan ke X"
        className={round}
      >
        <FaXTwitter className="h-4 w-4" aria-hidden="true" />
      </a>
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(canonical)}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Bagikan ke Facebook"
        className={round}
      >
        <FaFacebookF className="h-4 w-4" aria-hidden="true" />
      </a>
      <a
        href={`https://t.me/share/url?url=${encodeURIComponent(canonical)}&text=${encodeURIComponent(article.title)}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Bagikan ke Telegram"
        className={round}
      >
        <FaTelegram className="h-4 w-4" aria-hidden="true" />
      </a>
      <a
        href={`mailto:?subject=${encodeURIComponent(article.title)}&body=${shareText}`}
        aria-label="Bagikan via Email"
        className={round}
      >
        <Mail className="h-4 w-4" aria-hidden="true" />
      </a>
      <button
        type="button"
        onClick={() => void copy()}
        aria-label={copied ? 'Tautan tersalin' : 'Salin tautan artikel'}
        title={copied ? 'Tersalin!' : 'Salin tautan'}
        className={`${round} ${copied ? '!bg-[#2f7bff] !text-white !ring-[#2f7bff]' : ''}`}
      >
        {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Link2 className="h-4 w-4" aria-hidden="true" />}
      </button>
      <span aria-live="polite" className="font-sans text-xs font-semibold text-[#2f7bff]">
        {copied ? 'Tersalin!' : ''}
      </span>
    </p>
  );
}
