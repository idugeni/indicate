'use client';

import { useEffect, useMemo, useState } from 'react';

import { TipTapBodyView } from '@/modules/site/components/tiptap-body-view';
import { isTipTapDoc, type TipTapDoc } from '@/modules/site/tiptap-document';

type CommandFn = (action: string, payload: unknown) => Promise<unknown>;

function collectMediaIds(doc: TipTapDoc): readonly string[] {
  const found = new Set<string>();
  const pattern = /\/api\/network\/media\/([0-9a-fA-F-]{36})/gu;
  for (const match of JSON.stringify(doc).matchAll(pattern)) {
    const id = match[1];
    if (id !== undefined) found.add(id);
  }
  return [...found];
}

function rewriteMediaSrc(doc: TipTapDoc, mapping: ReadonlyMap<string, string>): TipTapDoc {
  let raw = JSON.stringify(doc);
  for (const [storedSrc, previewUrl] of mapping) {
    raw = raw.split(storedSrc).join(previewUrl);
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return isTipTapDoc(parsed) ? parsed : doc;
  } catch {
    return doc;
  }
}

/**
 * Render a dashboard preview of the article draft with readable image URLs.
 *
 * @param title - Draft headline; a placeholder shows when empty.
 * @param description - Draft description shown under the headline; omitted when empty.
 * @param doc - Draft TipTap JSON; an empty state shows when absent.
 * @param command - Dashboard dispatcher for `media.read` preview URLs.
 * @returns Article-styled preview; durable media refs resolve quietly with fallback.
 */
export function ArticlePreview({
  title,
  description,
  doc,
  command,
}: {
  readonly title: string;
  readonly description: string;
  readonly doc: TipTapDoc | null;
  readonly command: CommandFn;
}) {
  const [resolved, setResolved] = useState<ReadonlyMap<string, string>>(() => new Map());
  const [device, setDevice] = useState<'desktop' | 'ponsel'>('desktop');
  const mediaIds = useMemo(() => (doc === null ? [] : collectMediaIds(doc)), [doc]);

  useEffect(() => {
    if (doc === null) return undefined;
    const missing = mediaIds.filter((id) => !resolved.has(`/api/network/media/${id}`));
    if (missing.length === 0) return undefined;
    let cancelled = false;
    void (async () => {
      const next = new Map(resolved);
      await Promise.all(
        missing.map(async (id) => {
          try {
            const read = (await command('media.read', { mediaId: id })) as { readonly url?: unknown } | null;
            if (typeof read?.url === 'string' && read.url !== '') {
              next.set(`/api/network/media/${id}`, read.url);
            }
          } catch {
            /* Keep the durable relative URL. */
          }
        }),
      );
      if (!cancelled) setResolved(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [doc, command, mediaIds, resolved]);

  if (doc === null) {
    return (
      <p className="m-0 rounded border border-dashed border-hairline-strong p-6 text-center font-sans text-xs text-paper-faint">
        Belum ada isi — tulis dulu di tab Tulis.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end gap-1" role="group" aria-label="Lebar pratinjau">
        {(
          [
            { value: 'desktop', label: 'Desktop' },
            { value: 'ponsel', label: 'Ponsel' },
          ] as const
        ).map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={device === option.value}
            onClick={() => setDevice(option.value)}
            className={`rounded-md px-2 py-1 font-mono text-[11px] transition-colors duration-180 ${
              device === option.value
                ? 'bg-bg-raised-2 text-paper'
                : 'text-paper-faint hover:text-paper-dim'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      <article
        className={`space-y-3 rounded border border-hairline bg-bg-raised p-4 sm:p-5 ${
          device === 'ponsel' ? 'mx-auto max-w-[380px]' : 'w-full'
        }`}
      >
        <h1 className="m-0 font-sans text-xl font-extrabold leading-snug tracking-tight text-paper">
          {title.trim() === '' ? 'Tanpa judul' : title}
        </h1>
        {description.trim() === '' ? null : (
          <p className="m-0 border-l-2 border-brass pl-3 font-sans text-sm leading-relaxed text-paper-dim">{description}</p>
        )}
        <div className="space-y-3">
          <TipTapBodyView
            doc={rewriteMediaSrc(doc, resolved)}
            paragraphClassName="font-sans text-sm leading-relaxed text-paper"
            listClassName="space-y-1 pl-5 font-sans text-sm leading-relaxed text-paper [list-style:disc]"
          />
        </div>
      </article>
    </div>
  );
}
