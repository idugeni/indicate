'use client';

import type { CSSProperties } from 'react';
import { Link2 } from 'lucide-react';
import { toast } from 'sonner';

import type { ArticleListItem } from '@/modules/delivery/models';
import { buildShareChannels, type ShareChannelKey } from '@/modules/site/components/network/cards/share-channels';
import { TemplateTooltip } from '@/modules/site/components/network/ui/template-tooltip';

/**
 * Row of share buttons: filled WhatsApp primary, brand-tinted X/Facebook/
 * Telegram outlines that fill on hover, neutral email, plus copy link
 * (clipboard + toast).
 */
export interface ShareButtonsSkin {
  readonly muted: string;
  readonly ring: string;
  readonly xText: string;
}

/**
 * Row of share buttons: filled WhatsApp primary, brand-tinted X/Facebook/
 * Telegram outlines that fill on hover, neutral email, plus copy link
 * (clipboard + toast).
 *
 * @param skin - Neutral text, ring, and X glyph colours from the template theme.
 * @param article - Article being shared.
 * @param canonical - Canonical URL of the article.
 * @returns Share channel row.
 * @remarks Skin colours ride inline styles, not interpolated Tailwind
 * arbitrary values (`ring-[${...}]`): Tailwind only generates class names
 * it can read literally, so an interpolated one silently renders nothing
 * and the ring falls back to `currentColor` — the white circles on dark
 * heroes. Static brand colours stay as literal classes.
 */
export function ShareButtons({ skin, article, canonical }: { readonly skin: ShareButtonsSkin; readonly article: ArticleListItem; readonly canonical: string }) {
  const channels = buildShareChannels(article.title, canonical);
  const ringStyle = { '--tw-ring-color': skin.ring } as CSSProperties;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(canonical);
      toast.success('Tautan tersalin');
    } catch {
      toast.error('Gagal menyalin tautan');
    }
  };

  const round =
    'flex h-9 w-9 items-center justify-center rounded-full ring-1 transition-colors hover:text-[var(--tpl-primary)]';
  const channel =
    'flex h-9 w-9 items-center justify-center rounded-full ring-1 transition-colors hover:text-white hover:ring-transparent';
  const classByKey: Record<ShareChannelKey, string> = {
    whatsapp: 'flex h-9 w-9 items-center justify-center rounded-full bg-[var(--tpl-primary)] text-[var(--tpl-on-primary,#ffffff)] transition-colors hover:bg-[var(--tpl-primary-dark)]',
    x: `${channel} hover:bg-black`,
    facebook: `${channel} text-[#1877F2] hover:bg-[#1877F2]`,
    telegram: `${channel} text-[#229ED9] hover:bg-[#229ED9]`,
    email: round,
  };
  const styleByKey: Record<ShareChannelKey, CSSProperties> = {
    whatsapp: {},
    x: { ...ringStyle, color: skin.xText },
    facebook: ringStyle,
    telegram: ringStyle,
    email: { ...ringStyle, color: skin.muted },
  };

  return (
    <p className="m-0 flex flex-wrap items-center justify-start gap-2" aria-label="Bagikan artikel">
      {channels.map(({ key, label, href, Icon }) => (
        <a
          key={key}
          href={href}
          target={href.startsWith('mailto:') ? undefined : '_blank'}
          rel={href.startsWith('mailto:') ? undefined : 'noopener noreferrer'}
          aria-label={`Bagikan ke ${label}`}
          className={classByKey[key]}
          style={styleByKey[key]}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </a>
      ))}
      <TemplateTooltip label="Salin tautan">
        <button
          type="button"
          onClick={() => void copy()}
          aria-label="Salin tautan artikel"
          className={round}
          style={styleByKey.email}
        >
          <Link2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </TemplateTooltip>
    </p>
  );
}
