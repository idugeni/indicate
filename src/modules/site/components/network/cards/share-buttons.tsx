'use client';

import type { CSSProperties } from 'react';
import { Link2 } from 'lucide-react';
import { toast } from 'sonner';

import type { ArticleListItem } from '@/modules/delivery/models';
import { buildShareChannels, type ShareChannelKey } from '@/modules/site/components/network/cards/share-channels';
import { TemplateTooltip } from '@/modules/site/components/network/ui/template-tooltip';

/**
 * Row of share buttons: filled WhatsApp primary, brand-tinted X/Facebook/
 * Telegram that fill on hover, neutral email, plus copy link
 * (clipboard + toast).
 */
export interface ShareButtonsSkin {
  readonly muted: string;
  readonly ring: string;
  readonly xText: string;
}

/**
 * Row of share buttons: filled WhatsApp primary, brand-tinted X/Facebook/
 * Telegram that fill on hover, neutral email, plus copy link
 * (clipboard + toast).
 *
 * @param skin - Neutral text and X glyph colours from the template theme.
 * @param article - Article being shared.
 * @param canonical - Canonical URL of the article.
 * @param light - True saat tampil di atas foto gelap; hover memakai putih.
 * @param tone - Skema template; hover X dibalik saat gelap agar kontras.
 * @returns Share channel row.
 */
export function ShareButtons({
  skin,
  article,
  canonical,
  light = false,
  tone = 'light',
}: {
  readonly skin: ShareButtonsSkin;
  readonly article: ArticleListItem;
  readonly canonical: string;
  readonly light?: boolean;
  readonly tone?: 'light' | 'dark';
}) {
  const channels = buildShareChannels(article.title, canonical);
  const onDark = light || tone === 'dark';
  const softBase = light ? 'bg-white/10' : 'bg-[var(--tpl-primary-soft,#e8f0fe)]';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(canonical);
      toast.success('Tautan tersalin');
    } catch {
      toast.error('Gagal menyalin tautan');
    }
  };

  const round =
    `flex h-9 w-9 items-center justify-center rounded-full transition-colors ${softBase} ${light ? 'hover:text-white' : 'hover:text-[var(--tpl-primary)]'}`;
  const channelBase =
    `flex h-9 w-9 items-center justify-center rounded-full transition-colors ${softBase}`;
  const classByKey: Record<ShareChannelKey, string> = {
    whatsapp: 'flex h-9 w-9 items-center justify-center rounded-full bg-[var(--tpl-primary)] text-[var(--tpl-on-primary,#ffffff)] transition-colors hover:bg-[var(--tpl-primary-dark)]',
    x: onDark ? `${channelBase} hover:bg-white hover:text-black` : `${channelBase} hover:bg-black hover:text-white`,
    facebook: `${channelBase} text-[#1877F2] hover:bg-[#1877F2] hover:text-white`,
    telegram: `${channelBase} text-[#229ED9] hover:bg-[#229ED9] hover:text-white`,
    email: round,
  };
  const styleByKey: Record<ShareChannelKey, CSSProperties> = {
    whatsapp: {},
    x: { color: skin.xText },
    facebook: {},
    telegram: {},
    email: { color: skin.muted },
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
