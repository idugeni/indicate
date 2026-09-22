import type { ReactNode } from 'react';

import { parseArticleBody } from '@/modules/site/article-markup';
import { isTipTapDoc } from '@/modules/site/tiptap-document';
import { ArticleBodyView, type ArticleBodyImage } from '@/modules/site/components/article-body-view';
import { TipTapBodyView } from '@/modules/site/components/tiptap-body-view';

/**
 * Render canonical article content, preferring structured TipTap JSON with legacy fallback.
 *
 * @param body - Legacy plain-text body used when no valid structured document exists.
 * @param bodyJson - Stored TipTap JSON; rendered when it is a valid document.
 * @param images - Gallery images for legacy `[gambar:N]` markers.
 * @param paragraphClassName - Class applied to paragraphs.
 * @param listClassName - Class applied to lists.
 * @param headingClassName - Class applied to headings.
 * @param quoteClassName - Class applied to quotes.
 * @param renderFigure - Custom legacy figure renderer.
 * @returns Structured content when available, otherwise the legacy markup view.
 */
export function ArticleRichBodyView({
  body,
  bodyJson,
  images,
  paragraphClassName,
  listClassName,
  headingClassName,
  quoteClassName,
  renderFigure,
}: {
  readonly body: string;
  readonly bodyJson?: unknown;
  readonly images: readonly (ArticleBodyImage | null)[];
  readonly paragraphClassName: string;
  readonly listClassName: string;
  readonly headingClassName?: string | undefined;
  readonly quoteClassName?: string | undefined;
  readonly renderFigure?: ((image: ArticleBodyImage, index: number, caption: string | null) => ReactNode) | undefined;
}) {
  if (isTipTapDoc(bodyJson) && (bodyJson.content ?? []).length > 0) {
    return (
      <TipTapBodyView
        doc={bodyJson}
        paragraphClassName={paragraphClassName}
        listClassName={listClassName}
        headingClassName={headingClassName}
        quoteClassName={quoteClassName}
      />
    );
  }
  return (
    <ArticleBodyView
      blocks={parseArticleBody(body)}
      images={images}
      paragraphClassName={paragraphClassName}
      listClassName={listClassName}
      {...(headingClassName === undefined ? {} : { headingClassName })}
      {...(quoteClassName === undefined ? {} : { quoteClassName })}
      renderFigure={renderFigure}
    />
  );
}
