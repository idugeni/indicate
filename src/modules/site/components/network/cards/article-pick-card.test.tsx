// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { makeNetworkArticle } from '@/modules/delivery/network-test-fixtures';
import { ArticlePickCard, type PickCardSkin } from '@/modules/site/components/network/cards/article-pick-card';
import { CLEAN_BLUE, badgeStyle } from '@/modules/site/components/network/templates/clean-blue/theme';
import { ArticleMeta } from '@/modules/site/components/network/templates/clean-blue/ui/article-meta';

afterEach(() => {
  cleanup();
});

const skin: PickCardSkin = {
  cardClass: 'flex h-full flex-col overflow-hidden rounded-2xl border-0 bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/60',
  imageWrapperClass: 'relative px-3 pt-3',
  badgePlacement: 'overlay',
  badgeClass: 'absolute left-6 top-6 inline-block rounded-lg px-2.5 py-1 font-sans text-xs font-bold shadow-md',
  badgeStyle,
  headerClass: 'flex-1 px-5 pt-4',
  titleClass: 'line-clamp-2 font-sans text-[17px] font-bold leading-snug tracking-tight text-slate-900',
  titleLinkClass: 'hover:text-[#1a5fd0]',
  descriptionClass: 'line-clamp-3 font-sans text-sm leading-relaxed text-slate-600',
  publisherClass: 'm-0 truncate font-sans text-xs font-bold text-slate-800',
  footerClass: 'mt-auto flex items-center justify-between gap-3 border-t border-slate-100 bg-white px-5 py-3.5',
  arrowClass: 'flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[#e8f0fe] text-[#1a5fd0] transition-colors hover:bg-[#1a5fd0] hover:text-white',
  avatarSkin: CLEAN_BLUE.authorAvatar,
  Meta: ArticleMeta,
};

const artikel = makeNetworkArticle({
  id: 'a-pick',
  slug: 'berita-pilihan',
  title: 'Judul pilihan',
  attribution: 'Redaksi Mediaindomedia',
  categoryName: 'Politik',
  viewCount: 1200,
});

describe('ArticlePickCard', () => {
  it('merender judul sebagai heading h3', () => {
    render(<ArticlePickCard article={artikel} index={0} skin={skin} />);
    const judul = screen.getByRole('heading', { level: 3 });
    expect(judul.textContent).toContain('Judul pilihan');
  });

  it('panah dekoratif tidak masuk pohon aksesibilitas', () => {
    render(<ArticlePickCard article={artikel} index={0} skin={skin} />);
    const panah = document.querySelector('a[aria-hidden="true"]');
    expect(panah?.getAttribute('tabindex')).toBe('-1');
    expect(screen.queryByRole('link', { name: /^Baca:/ })).toBeNull();
  });
});
