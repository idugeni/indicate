import type { ArticleListItem } from '@/modules/delivery/models';
import { HomeHero } from '@/modules/site/components/network/ui/home-hero';
import { GREEN_MINIMAL } from '@/modules/site/components/network/templates/green-minimal/theme';

/**
 * Hero GreenMinimal: varian overlay dari mode hero homepage bersama.
 *
 * @param articles - Cerita teratas halaman.
 * @returns Hero sorotan utama milik template.
 */
export function GreenMinimalHero({ articles }: { readonly articles: readonly ArticleListItem[] }) {
  return (
    <HomeHero
      variant="overlay"
      articles={articles}
      skin={{
        accent: GREEN_MINIMAL.primary,
        tone: 'light',
        ink: GREEN_MINIMAL.ink,
        muted: GREEN_MINIMAL.muted,
        authorAvatar: GREEN_MINIMAL.authorAvatar,
      }}
    />
  );
}
