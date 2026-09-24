import type { ReactNode } from 'react';

import type { ArticleBlock, TextSegment } from '@/modules/site/article-markup';

function renderSegments(segments: readonly TextSegment[], keyPrefix: string): ReactNode {
  return segments.map((segment, index) => {
    const key = `${keyPrefix}-${index}`;
    const lines = segment.text.split('\n').map((line, lineIndex) => (
      <span key={lineIndex}>
        {lineIndex > 0 ? <br /> : null}
        {segment.bold ? <strong>{line}</strong> : segment.italic ? <em>{line}</em> : line}
      </span>
    ));
    if (segment.href === undefined) return <span key={key}>{lines}</span>;
    return <a key={key} href={segment.href} target="_blank" rel="noopener noreferrer">{lines}</a>;
  });
}

/**
 * Render plain-text fallback blocks (headings, quotes, lists, paragraphs).
 *
 * @param blocks - Blocks from the plain-text body parser.
 * @param paragraphClassName - Class applied to paragraphs.
 * @param listClassName - Class applied to lists.
 * @param headingClassName - Class applied to headings; defaults to paragraph styling.
 * @param quoteClassName - Class applied to quotes; defaults to paragraph styling.
 * @returns Static content without media: images live in TipTap JSON.
 */
export function ArticleBodyView({
  blocks,
  paragraphClassName,
  listClassName,
  headingClassName,
  quoteClassName,
}: {
  readonly blocks: readonly ArticleBlock[];
  readonly paragraphClassName: string;
  readonly listClassName: string;
  readonly headingClassName?: string;
  readonly quoteClassName?: string;
}) {
  return (
    <>
      {blocks.map((block, index) => {
        if (block.kind === 'heading') {
          const className = headingClassName ?? paragraphClassName;
          return block.level === 3
            ? <h3 key={index} className={className}>{renderSegments(block.segments, `${index}`)}</h3>
            : <h2 key={index} className={className}>{renderSegments(block.segments, `${index}`)}</h2>;
        }
        if (block.kind === 'quote') {
          return <blockquote key={index} className={quoteClassName ?? paragraphClassName}>{renderSegments(block.segments, `${index}`)}</blockquote>;
        }
        if (block.kind === 'list') {
          return (
            <ul key={index} className={listClassName}>
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{renderSegments(item, `${index}-${itemIndex}`)}</li>
              ))}
            </ul>
          );
        }
        return <p key={index} className={paragraphClassName}>{renderSegments(block.segments, `${index}`)}</p>;
      })}
    </>
  );
}
