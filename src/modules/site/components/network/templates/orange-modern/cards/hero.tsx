import type { ArticleListItem } from '@/modules/delivery/models';
import { HomeHero } from '@/modules/site/components/network/ui/home-hero';
import { ORANGE_MODERN } from '@/modules/site/components/network/templates/orange-modern/theme';

/**
 * Hero OrangeModern: varian overlay dari mode hero homepage bersama.
 *
 * @param articles - Cerita teratas halaman.
 * @returns Hero sorotan utama milik template.
 */
export function OrangeModernHero({ articles }: { readonly articles: readonly ArticleListItem[] }) {
  return (
    <HomeHero
      variant="overlay"
      articles={articles}
      skin={{
        accent: ORANGE_MODERN.primary,
        tone: 'light',
        ink: ORANGE_MODERN.ink,
        muted: ORANGE_MODERN.muted,
        authorAvatar: ORANGE_MODERN.authorAvatar,
      }}
    />
  );
}
