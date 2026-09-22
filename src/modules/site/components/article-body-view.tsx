import type { ReactNode } from 'react';
import { Play } from 'lucide-react';

import type { ArticleBlock, TextSegment } from '@/modules/site/article-markup';

export interface ArticleBodyImage {
  readonly url: string;
  readonly alt: string;
}

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

export function ArticleBodyView({
  blocks,
  images,
  paragraphClassName,
  listClassName,
  headingClassName,
  quoteClassName,
  renderFigure,
}: {
  readonly blocks: readonly ArticleBlock[];
  readonly images: readonly (ArticleBodyImage | null)[];
  readonly paragraphClassName: string;
  readonly listClassName: string;
  readonly headingClassName?: string;
  readonly quoteClassName?: string;
  readonly renderFigure?: ((image: ArticleBodyImage, index: number, caption: string | null) => ReactNode) | undefined;
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
        if (block.kind === 'youtube') {
          return (
            <div key={index} className="m-0 overflow-hidden rounded-2xl">
              <a
                href={`https://www.youtube.com/watch?v=${block.videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Tonton video di YouTube (ID ${block.videoId})`}
                className="group flex items-center gap-4 rounded-2xl bg-slate-100 p-4 transition-colors hover:bg-slate-200"
              >
                <span aria-hidden="true" className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-slate-900 text-white transition-transform group-hover:scale-105">
                  <Play className="h-5 w-5 fill-current" />
                </span>
                <span className="min-w-0">
                  <span className="block font-sans text-sm font-semibold text-slate-900">Video YouTube</span>
                  <span className="block truncate font-mono text-xs text-slate-500">youtube.com/watch?v={block.videoId}</span>
                </span>
              </a>
            </div>
          );
        }
        if (block.kind === 'figure') {
          const image = images[block.index - 1] ?? null;
          const caption = block.caption === '' ? null : block.caption;
          if (image === null) return <p key={index} className={paragraphClassName}>[gambar:{block.index}]</p>;
          if (renderFigure !== undefined) return <span key={index} className="block">{renderFigure(image, block.index, caption)}</span>;
          return (
            <figure key={index} className="m-0 rounded-xl bg-slate-100 p-6 text-center font-sans text-sm text-slate-500">
              {image.alt} (pratinjau)
              {caption === null ? null : <figcaption>{caption}</figcaption>}
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
