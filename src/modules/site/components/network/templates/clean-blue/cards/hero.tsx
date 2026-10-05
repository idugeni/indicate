import type { ArticleListItem } from '@/modules/delivery/models';
import { HomeHero } from '@/modules/site/components/network/ui/home-hero';
import { CLEAN_BLUE } from '@/modules/site/components/network/templates/clean-blue/theme';
import { CleanBlueHeroActions } from '@/modules/site/components/network/templates/clean-blue/cards/hero-actions';

/**
 * Hero CleanBlue: varian split dari mode hero homepage bersama.
 *
 * @param articles - Cerita teratas halaman.
 * @returns Hero sorotan utama milik template.
 */
export function CleanBlueHero({ articles }: { readonly articles: readonly ArticleListItem[] }) {
  const [first] = articles;
  return (
    <HomeHero
      variant="split"
      articles={articles}
      skin={{
        accent: CLEAN_BLUE.primary,
        tone: 'light',
        ink: CLEAN_BLUE.ink,
        muted: CLEAN_BLUE.muted,
        authorAvatar: CLEAN_BLUE.authorAvatar,
      }}
      actions={first === undefined ? undefined : <CleanBlueHeroActions slug={first.slug} title={first.title} href={first.href} />}
    />
  );
}
