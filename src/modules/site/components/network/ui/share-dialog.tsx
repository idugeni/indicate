'use client';

import { useState } from 'react';
import { Check, Link2, Mail, Share2 } from 'lucide-react';
import { FaFacebookF, FaTelegram, FaWhatsapp, FaXTwitter } from 'react-icons/fa6';
import { toast } from 'sonner';

import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/ui/cn';

/**
 * Template share button props; `className` is intentionally a string so it merges via `cn()`.
 */
export type TemplateShareButtonProps = {
  readonly slug: string;
  readonly title: string;
  readonly className?: string | undefined;
};

/**
 * Share button opening the channel dialog on every platform.
 *
 * @param props - Article slug and title plus caller shape classes.
 * @returns Round icon button plus a `--tpl-*`-themed channel dialog.
 */
export function TemplateShareButton({ slug, title, className }: TemplateShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const url = typeof window === 'undefined' ? `/${slug}` : `${window.location.origin}/${slug}`;
  const shareText = encodeURIComponent(`${title} ${url}`);

  const openShare = () => {
    setCopied(false);
    setOpen(true);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Tautan tersalin');
    } catch {
      toast.error('Gagal menyalin tautan');
    }
  };

  const channels = [
    {
      label: 'WhatsApp',
      href: `https://wa.me/?text=${shareText}`,
      Icon: FaWhatsapp,
      circle: 'bg-[#25D366] group-hover:bg-[#1DA851]',
    },
    {
      label: 'X',
      href: `https://x.com/intent/post?text=${shareText}`,
      Icon: FaXTwitter,
      circle: 'bg-black ring-1 ring-white/30 group-hover:bg-[#333333]',
    },
    {
      label: 'Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      Icon: FaFacebookF,
      circle: 'bg-[#1877F2] group-hover:bg-[#1466C3]',
    },
    {
      label: 'Telegram',
      href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
      Icon: FaTelegram,
      circle: 'bg-[#229ED9] group-hover:bg-[#1B8ABF]',
    },
    {
      label: 'Email',
      href: `mailto:?subject=${encodeURIComponent(title)}&body=${shareText}`,
      Icon: Mail,
      circle: 'bg-[#64748B] group-hover:bg-[#475569]',
    },
  ] as const;

  return (
    <>
      <button
        type="button"
        onClick={openShare}
        aria-label="Bagikan artikel"
        title="Bagikan artikel"
        className={className}
      >
        <Share2 className="h-4 w-4" aria-hidden="true" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          aria-label="Pilih kanal bagikan"
          className={cn(
            'border-[var(--tpl-ring,#e2e8f0)] bg-[var(--tpl-card,#ffffff)] text-[var(--tpl-ink,#0f172a)] dark:border-[var(--tpl-ring,#e2e8f0)] dark:bg-[var(--tpl-card,#ffffff)] dark:text-[var(--tpl-ink,#0f172a)]',
            '[&_button[data-slot=dialog-close]]:text-[var(--tpl-faint,#94a3b8)] [&_button[data-slot=dialog-close]]:hover:text-[var(--tpl-ink,#0f172a)]',
          )}
        >
          <div className="flex min-w-0 flex-col gap-1.5">
            <DialogTitle className="font-sans text-base font-extrabold tracking-tight">
              Bagikan artikel
            </DialogTitle>
            <DialogDescription className="line-clamp-2 font-sans text-[13px] leading-relaxed text-[var(--tpl-muted,#475569)]">
              {title}
            </DialogDescription>
          </div>
          <ul className="m-0 grid list-none grid-cols-3 gap-2 p-0 sm:grid-cols-5">
            {channels.map(({ label, href, Icon, circle }) => (
              <li key={label} className="m-0 min-w-0 p-0">
                <a
                  href={href}
                  target={href.startsWith('mailto:') ? undefined : '_blank'}
                  rel={href.startsWith('mailto:') ? undefined : 'noopener noreferrer'}
                  aria-label={`Bagikan ke ${label}`}
                  title={`Bagikan ke ${label}`}
                  className="group flex min-w-0 flex-col items-center gap-1.5 rounded-xl px-1 py-3 font-sans text-[11px] font-semibold text-[var(--tpl-muted,#475569)] transition-colors hover:bg-[var(--tpl-primary-soft,#e8f0fe)] hover:text-[var(--tpl-primary,#1a5fd0)]"
                >
                  <span className={`flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors ${circle}`}>
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  {label}
                </a>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => void copy()}
            aria-label="Salin tautan artikel"
            className="flex w-full min-w-0 items-center gap-2.5 rounded-xl border border-[var(--tpl-ring,#e2e8f0)] bg-[var(--tpl-canvas,#f5f8fd)] px-3.5 py-2.5 text-left font-sans text-[13px] transition-colors hover:border-[var(--tpl-primary,#1a5fd0)] dark:border-[var(--tpl-ring,#e2e8f0)] dark:bg-[var(--tpl-canvas,#f5f8fd)]"
          >
            {copied ? (
              <Check className="h-4 w-4 flex-none text-[var(--tpl-primary,#1a5fd0)]" aria-hidden="true" />
            ) : (
              <Link2 className="h-4 w-4 flex-none text-[var(--tpl-faint,#94a3b8)]" aria-hidden="true" />
            )}
            <span className="min-w-0 flex-1 truncate">{copied ? 'Tautan tersalin!' : url}</span>
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
}
