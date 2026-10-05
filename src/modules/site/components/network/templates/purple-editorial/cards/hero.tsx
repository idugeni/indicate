import type { ArticleListItem } from '@/modules/delivery/models';
import { HomeHero } from '@/modules/site/components/network/ui/home-hero';
import { PURPLE_EDITORIAL } from '@/modules/site/components/network/templates/purple-editorial/theme';

/**
 * Hero PurpleEditorial: varian mosaic dari mode hero homepage bersama.
 *
 * @param articles - Cerita teratas halaman.
 * @returns Hero sorotan utama milik template.
 */
export function PurpleEditorialHero({ articles }: { readonly articles: readonly ArticleListItem[] }) {
  return (
    <HomeHero
      variant="mosaic"
      articles={articles}
      skin={{
        accent: PURPLE_EDITORIAL.primary,
        tone: 'light',
        ink: PURPLE_EDITORIAL.ink,
        muted: PURPLE_EDITORIAL.muted,
        authorAvatar: PURPLE_EDITORIAL.authorAvatar,
      }}
    />
  );
}
