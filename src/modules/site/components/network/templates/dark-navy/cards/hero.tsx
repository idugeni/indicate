import type { ArticleListItem } from '@/modules/delivery/models';
import { HomeHero } from '@/modules/site/components/network/ui/home-hero';
import { DARK_NAVY } from '@/modules/site/components/network/templates/dark-navy/theme';

/**
 * Hero DarkNavy: varian carousel dari mode hero homepage bersama.
 *
 * @param articles - Cerita teratas halaman.
 * @returns Hero sorotan utama milik template.
 */
export function DarkNavyHero({ articles }: { readonly articles: readonly ArticleListItem[] }) {
  return (
    <HomeHero
      variant="carousel"
      articles={articles}
      skin={{
        accent: DARK_NAVY.primary,
        tone: 'dark',
        ink: DARK_NAVY.ink,
        muted: DARK_NAVY.muted,
        authorAvatar: DARK_NAVY.authorAvatar,
      }}
    />
  );
}
