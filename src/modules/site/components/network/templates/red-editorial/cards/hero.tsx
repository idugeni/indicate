import type { ArticleListItem } from '@/modules/delivery/models';
import { HomeHero } from '@/modules/site/components/network/ui/home-hero';
import { RED_EDITORIAL } from '@/modules/site/components/network/templates/red-editorial/theme';

/**
 * Hero RedEditorial: varian carousel dari mode hero homepage bersama.
 *
 * @param articles - Cerita teratas halaman.
 * @returns Hero sorotan utama milik template.
 */
export function RedEditorialHero({ articles }: { readonly articles: readonly ArticleListItem[] }) {
  return (
    <HomeHero
      variant="carousel"
      articles={articles}
      skin={{
        accent: RED_EDITORIAL.primary,
        tone: 'light',
        ink: RED_EDITORIAL.ink,
        muted: RED_EDITORIAL.muted,
        authorAvatar: RED_EDITORIAL.authorAvatar,
      }}
    />
  );
}
