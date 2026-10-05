import type { ArticleListItem } from '@/modules/delivery/models';
import { HomeHero } from '@/modules/site/components/network/ui/home-hero';
import { BLACK_LIME } from '@/modules/site/components/network/templates/black-lime/theme';

/**
 * Hero BlackLime: varian mosaic dari mode hero homepage bersama.
 *
 * @param articles - Cerita teratas halaman.
 * @returns Hero sorotan utama milik template.
 */
export function BlackLimeHero({ articles }: { readonly articles: readonly ArticleListItem[] }) {
  return (
    <HomeHero
      variant="mosaic"
      articles={articles}
      skin={{
        accent: BLACK_LIME.primary,
        tone: 'dark',
        ink: BLACK_LIME.ink,
        muted: BLACK_LIME.muted,
        authorAvatar: BLACK_LIME.authorAvatar,
      }}
    />
  );
}
