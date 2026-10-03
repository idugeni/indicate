import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { ArticleBodyView } from '@/modules/site/components/article-body-view';
import { parseArticleBody } from '@/modules/site/article-markup';

const PARAGRAPH = 'font-sans text-sm';

describe('ArticleBodyView', () => {
  it('memberi nofollow pada tautan luar di badan artikel', () => {
    const html = renderToStaticMarkup(
      <ArticleBodyView
        blocks={parseArticleBody('Rinciannya ada di [sumber resmi](https://sumber.id/berita).')}
        paragraphClassName={PARAGRAPH}
        listClassName={PARAGRAPH}
      />,
    );
    expect(html).toContain('href="https://sumber.id/berita"');
    expect(html).toContain('rel="noopener noreferrer nofollow"');
  });
});