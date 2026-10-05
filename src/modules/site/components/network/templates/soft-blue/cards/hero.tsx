import type { ArticleListItem } from '@/modules/delivery/models';
import { HomeHero } from '@/modules/site/components/network/ui/home-hero';
import { SOFT_BLUE } from '@/modules/site/components/network/templates/soft-blue/theme';
import { SoftBlueHeroActions } from '@/modules/site/components/network/templates/soft-blue/cards/hero-actions';

/**
 * Hero SoftBlue: varian split dari mode hero homepage bersama.
 *
 * @param articles - Cerita teratas halaman.
 * @returns Hero sorotan utama milik template.
 */
export function SoftBlueHero({ articles }: { readonly articles: readonly ArticleListItem[] }) {
  const [first] = articles;
  return (
    <HomeHero
      variant="split"
      articles={articles}
      skin={{
        accent: SOFT_BLUE.primary,
        tone: 'light',
        ink: SOFT_BLUE.ink,
        muted: SOFT_BLUE.muted,
        authorAvatar: SOFT_BLUE.authorAvatar,
      }}
      actions={first === undefined ? undefined : <SoftBlueHeroActions slug={first.slug} title={first.title} href={first.href} />}
    />
  );
}
