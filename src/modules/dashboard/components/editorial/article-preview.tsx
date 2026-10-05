'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { EmptyState } from '@/modules/dashboard/components/empty-state';
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
 * @param coverImageUrl - Draft cover image URL; omitted when null.
 * @param doc - Draft TipTap JSON; an empty state shows when absent.
 * @param command - Dashboard dispatcher for `media.read` preview URLs.
 * @param ownerOrganizationId - Media-owning org for cross-org drafts; omitted for same-org drafts.
 * @returns Article-styled preview; durable media refs resolve quietly with fallback.
 */
export function ArticlePreview({
  title,
  description,
  coverImageUrl = null,
  doc,
  command,
  ownerOrganizationId,
}: {
  readonly title: string;
  readonly description: string;
  readonly coverImageUrl?: string | null;
  readonly doc: TipTapDoc | null;
  readonly command: CommandFn;
  readonly ownerOrganizationId?: string | null | undefined;
}) {
  const [resolved, setResolved] = useState<ReadonlyMap<string, string>>(() => new Map());
  const expiryRef = useRef<ReadonlyMap<string, number>>(new Map());
  const [device, setDevice] = useState<'desktop' | 'ponsel'>('desktop');
  const mediaIds = useMemo(() => (doc === null ? [] : collectMediaIds(doc)), [doc]);

  useEffect(() => {
    if (doc === null) return undefined;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      const now = Date.now();
      const missing = mediaIds.filter((id) => {
        if (resolved.get(`/api/network/media/${id}`) === undefined) return true;
        return (expiryRef.current.get(id) ?? 0) - 60_000 <= now;
      });
      if (missing.length === 0) return;
      void (async () => {
        try {
          const result = (await command('media.readMany', {
            mediaIds: missing,
            ...(ownerOrganizationId === undefined || ownerOrganizationId === null
              ? {}
              : { ownerOrganizationId }),
          })) as {
            readonly items?: readonly { readonly mediaId?: unknown; readonly url?: unknown; readonly expiresAt?: unknown }[];
          } | null;
          if (!Array.isArray(result?.items) || cancelled) return;
          const next = new Map(resolved);
          const expiry = new Map(expiryRef.current);
          for (const item of result.items) {
            if (typeof item?.mediaId !== 'string' || typeof item?.url !== 'string' || item.url === '') continue;
            next.set(`/api/network/media/${item.mediaId}`, item.url);
            const expires = typeof item?.expiresAt === 'string' ? Date.parse(item.expiresAt) : Number.NaN;
            if (Number.isFinite(expires)) expiry.set(item.mediaId, expires);
          }
          expiryRef.current = expiry;
          setResolved(next);
        } catch {
          /* Keep the durable relative URL. */
        }
      })();
    }, 500);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [doc, command, mediaIds, resolved, ownerOrganizationId]);

  if (doc === null) {
    return (
      <EmptyState title="Belum ada isi" description="Tulis dulu di tab Tulis." />
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end">
        <ToggleGroup
          variant="outline"
          size="sm"
          spacing={1}
          value={[device]}
          onValueChange={(values) => {
            const next = values[values.length - 1];
            if (next === 'desktop' || next === 'ponsel') setDevice(next);
          }}
          aria-label="Lebar pratinjau"
        >
          {(
            [
              { value: 'desktop', label: 'Desktop' },
              { value: 'ponsel', label: 'Ponsel' },
            ] as const
          ).map((option) => (
            <ToggleGroupItem
              key={option.value}
              value={option.value}
              aria-label={`Pratinjau ${option.label}`}
              className="font-mono text-[11px] tabular-nums"
            >
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <article
        className={`space-y-3 rounded border border-hairline bg-bg-raised p-4 sm:p-5 ${
          device === 'ponsel' ? 'mx-auto max-w-[380px]' : 'w-full'
        }`}
      >
        <h1 className="m-0 font-sans text-xl font-extrabold leading-snug tracking-tight text-paper">
          {title.trim() === '' ? 'Tanpa judul' : title}
        </h1>
        {coverImageUrl === null || coverImageUrl === '' ? null : (
          <Image unoptimized src={coverImageUrl} alt="" width={1200} height={675} sizes="(max-width: 768px) 100vw, 768px" className="aspect-video w-full rounded-md border border-hairline object-cover" />
        )}
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
