'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { ClipboardCopy } from 'lucide-react';

import { Button } from '@/components/ui/button';

/**
 * Renders the shareable text of a published article: its headline, then every
 * live URL numbered in display order.
 *
 * @param params.title - Article headline, omitted from the text when blank.
 * @param params.urls - Live URLs in the order they should be numbered.
 * @returns Plain text, no code fence, so pasting it into a chat leaves clean lines.
 * @remarks Numbering follows display order rather than publish order, so the
 * copy and the screen can never disagree about which number belongs to which
 * portal. A code fence is deliberately absent: it would paste as literal
 * backticks into the chat.
 */
export function formatPublishedUrlBlock(params: {
  readonly title?: string | null;
  readonly urls: readonly string[];
}): string {
  const heading = params.title?.trim() ?? '';
  const lines = params.urls.map((url, index) => `${index + 1}. ${url}`);
  return heading === '' ? lines.join('\n') : [heading, '', ...lines].join('\n');
}

/**
 * Numbered code block of an article's live URLs with a copy control.
 *
 * @param props.title - Article headline shown above the block and copied with it.
 * @param props.urls - Live URLs; the block renders nothing when empty.
 * @returns The block and its copy button, or null when no URL is live yet.
 * @remarks One network carries thousands of portals, so the block scrolls
 * internally while the copy always carries the full list: a reader sharing to a
 * chat needs every link, not the handful that fit on screen.
 */
export function PublishedUrlBlock({
  title,
  urls,
}: {
  readonly title: string;
  readonly urls: readonly string[];
}) {
  const [isCopied, setIsCopied] = useState(false);
  if (urls.length === 0) return null;
  const text = formatPublishedUrlBlock({ title, urls });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      toast.success(`${urls.length} URL tersalin. Tempel ke WhatsApp.`);
    } catch {
      toast.error('Clipboard ditolak browser. Blok teks bisa disalin manual.');
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-[11px] uppercase tracking-wider text-paper-faint">
          {urls.length.toLocaleString('id-ID')} URL tayang
        </span>
        <Button type="button" variant="outline" size="xs" onClick={() => { void copy(); }}>
          <ClipboardCopy className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{isCopied ? 'Tersalin' : 'Salin untuk WhatsApp'}</span>
        </Button>
      </div>
      <pre
        aria-label={`Daftar URL untuk ${title}`}
        className="max-h-72 overflow-auto whitespace-pre-wrap break-all rounded border border-hairline bg-bg p-2.5 font-mono text-[11px] leading-relaxed text-paper"
      >
        <code>{text}</code>
      </pre>
    </div>
  );
}
