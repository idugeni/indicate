import type { ArticleListItem } from '@/modules/delivery/models';
import { HomeHero } from '@/modules/site/components/network/ui/home-hero';
import { GLASSY_BLUE } from '@/modules/site/components/network/templates/glassy-blue/theme';

/**
 * Hero GlassyBlue: varian overlay dari mode hero homepage bersama.
 *
 * @param articles - Cerita teratas halaman.
 * @returns Hero sorotan utama milik template.
 */
export function GlassyBlueHero({ articles }: { readonly articles: readonly ArticleListItem[] }) {
  return (
    <HomeHero
      variant="overlay"
      articles={articles}
      skin={{
        accent: GLASSY_BLUE.primary,
        tone: 'light',
        ink: GLASSY_BLUE.ink,
        muted: GLASSY_BLUE.muted,
        authorAvatar: GLASSY_BLUE.authorAvatar,
      }}
    />
  );
}
