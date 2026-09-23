'use client';

import { Link2, Mail } from 'lucide-react';
import { FaFacebookF, FaTelegram, FaWhatsapp, FaXTwitter } from 'react-icons/fa6';
import { toast } from 'sonner';

import type { ArticleListItem } from '@/modules/delivery/models';

/**
 * Row of share buttons: filled WhatsApp primary, brand-tinted X/Facebook/
 * Telegram outlines that fill on hover, neutral email, plus copy link
 * (clipboard + toast).
 */
export function GreenMinimalShareButtons({ article, canonical }: { readonly article: ArticleListItem; readonly canonical: string }) {
  const shareText = encodeURIComponent(`${article.title} ${canonical}`);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(canonical);
      toast.success('Tautan tersalin');
    } catch {
      toast.error('Gagal menyalin tautan');
    }
  };

  const round =
    'flex h-9 w-9 items-center justify-center rounded-full text-slate-600 ring-1 ring-slate-200 transition-colors hover:text-[var(--tpl-primary,#1d7a38)]';
  const channel =
    'flex h-9 w-9 items-center justify-center rounded-full ring-1 ring-slate-200 transition-colors hover:text-white hover:ring-transparent';
  const xChannel = `${channel} text-black hover:bg-black`;
  const facebookChannel = `${channel} text-[#1877F2] hover:bg-[#1877F2]`;
  const telegramChannel = `${channel} text-[#229ED9] hover:bg-[#229ED9]`;

  return (
    <p className="m-0 flex w-full flex-wrap items-center justify-center gap-2 sm:w-auto sm:justify-start" aria-label="Bagikan artikel">
      <a
        href={`https://wa.me/?text=${shareText}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Bagikan ke WhatsApp"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--tpl-primary,#1d7a38)] text-white transition-colors hover:bg-[var(--tpl-primary-dark,#145c2a)]"
      >
        <FaWhatsapp className="h-4 w-4" aria-hidden="true" />
      </a>
      <a
        href={`https://x.com/intent/post?text=${shareText}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Bagikan ke X"
        className={xChannel}
      >
        <FaXTwitter className="h-4 w-4" aria-hidden="true" />
      </a>
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(canonical)}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Bagikan ke Facebook"
        className={facebookChannel}
      >
        <FaFacebookF className="h-4 w-4" aria-hidden="true" />
      </a>
      <a
        href={`https://t.me/share/url?url=${encodeURIComponent(canonical)}&text=${encodeURIComponent(article.title)}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Bagikan ke Telegram"
        className={telegramChannel}
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
        aria-label="Salin tautan artikel"
        title="Salin tautan"
        className={round}
      >
        <Link2 className="h-4 w-4" aria-hidden="true" />
      </button>
    </p>
  );
}
