'use client';

import { Link2, Mail } from 'lucide-react';
import { FaFacebookF, FaTelegram, FaWhatsapp, FaXTwitter } from 'react-icons/fa6';
import { toast } from 'sonner';

import type { ArticleListItem } from '@/modules/delivery/models';

/**
 * Row of share buttons: WhatsApp, X, Facebook, Telegram, email,
 * plus copy link (clipboard + toast).
 */
export function CleanBlueShareButtons({ article, canonical }: { readonly article: ArticleListItem; readonly canonical: string }) {
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
    'flex h-9 w-9 items-center justify-center rounded-full text-slate-600 ring-1 ring-slate-200 transition-colors hover:text-[var(--tpl-primary,#1a5fd0)]';

  return (
    <p className="m-0 flex w-full flex-wrap items-center justify-center gap-2 sm:w-auto sm:justify-start" aria-label="Bagikan artikel">
      <a
        href={`https://wa.me/?text=${shareText}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Bagikan ke WhatsApp"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--tpl-primary,#1a5fd0)] text-white transition-colors hover:bg-[var(--tpl-primary-dark,#155cb8)]"
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
        aria-label="Salin tautan artikel"
        title="Salin tautan"
        className={round}
      >
        <Link2 className="h-4 w-4" aria-hidden="true" />
      </button>
    </p>
  );
}
