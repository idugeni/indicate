import type { ArticleListItem } from '@/modules/delivery/models';
import { HomeHero } from '@/modules/site/components/network/ui/home-hero';
import { WARM_EDITORIAL } from '@/modules/site/components/network/templates/warm-editorial/theme';

/**
 * Hero WarmEditorial: varian serif dari mode hero homepage bersama.
 *
 * @param articles - Cerita teratas halaman.
 * @returns Hero sorotan utama milik template.
 */
export function WarmEditorialHero({ articles }: { readonly articles: readonly ArticleListItem[] }) {
  return (
    <HomeHero
      variant="serif"
      articles={articles}
      skin={{
        accent: WARM_EDITORIAL.primary,
        tone: 'light',
        ink: WARM_EDITORIAL.ink,
        muted: WARM_EDITORIAL.muted,
        authorAvatar: WARM_EDITORIAL.authorAvatar,
      }}
    />
  );
}
