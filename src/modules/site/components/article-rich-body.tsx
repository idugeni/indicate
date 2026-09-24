import { parseArticleBody } from '@/modules/site/article-markup';
import { isTipTapDoc } from '@/modules/site/tiptap-document';
import { ArticleBodyView } from '@/modules/site/components/article-body-view';
import { TipTapBodyView } from '@/modules/site/components/tiptap-body-view';

/**
 * Render canonical article content, preferring structured TipTap JSON with plain-text fallback.
 *
 * @param body - Plain-text body used when no valid structured document exists.
 * @param bodyJson - Stored TipTap JSON; rendered when it is a valid document.
 * @param paragraphClassName - Class applied to paragraphs.
 * @param listClassName - Class applied to lists.
 * @param headingClassName - Class applied to headings.
 * @param quoteClassName - Class applied to quotes.
 * @returns Structured content when available, otherwise the plain-text view. Gallery renders separately via `ArticleGallery`.
 */
export function ArticleRichBodyView({
  body,
  bodyJson,
  paragraphClassName,
  listClassName,
  headingClassName,
  quoteClassName,
}: {
  readonly body: string;
  readonly bodyJson?: unknown;
  readonly paragraphClassName: string;
  readonly listClassName: string;
  readonly headingClassName?: string | undefined;
  readonly quoteClassName?: string | undefined;
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
      paragraphClassName={paragraphClassName}
      listClassName={listClassName}
      {...(headingClassName === undefined ? {} : { headingClassName })}
      {...(quoteClassName === undefined ? {} : { quoteClassName })}
    />
  );
}
