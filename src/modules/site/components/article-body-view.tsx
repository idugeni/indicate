import type { ReactNode } from 'react';

import type { ArticleBlock, TextSegment } from '@/modules/site/article-markup';

export interface ArticleBodyImage {
  readonly url: string;
  readonly alt: string;
}

function renderSegments(segments: readonly TextSegment[], keyPrefix: string): ReactNode {
  return segments.map((segment, index) => (
    <span key={`${keyPrefix}-${index}`}>
      {segment.text.split('\n').map((line, lineIndex) => (
        <span key={lineIndex}>
          {lineIndex > 0 ? <br /> : null}
          {segment.bold ? <strong>{line}</strong> : segment.italic ? <em>{line}</em> : line}
        </span>
      ))}
    </span>
  ));
}

export function ArticleBodyView({
  blocks,
  images,
  paragraphClassName,
  listClassName,
  renderFigure,
}: {
  readonly blocks: readonly ArticleBlock[];
  readonly images: readonly (ArticleBodyImage | null)[];
  readonly paragraphClassName: string;
  readonly listClassName: string;
  readonly renderFigure?: ((image: ArticleBodyImage, index: number) => ReactNode) | undefined;
}) {
  return (
    <>
      {blocks.map((block, index) => {
        if (block.kind === 'figure') {
          const image = images[block.index - 1] ?? null;
          if (image === null) return <p key={index} className={paragraphClassName}>[gambar:{block.index}]</p>;
          if (renderFigure !== undefined) return <span key={index} className="block">{renderFigure(image, block.index)}</span>;
          return (
            <figure key={index} className="m-0 rounded-xl bg-slate-100 p-6 text-center font-sans text-sm text-slate-500">
              {image.alt} (pratinjau)
            </figure>
          );
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
