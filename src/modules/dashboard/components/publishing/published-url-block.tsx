'use client';

import { useId, useState } from 'react';
import { toast } from 'sonner';
import { ChevronDown, ClipboardCopy } from 'lucide-react';

import { Button } from '@/components/ui/button';

/**
 * Renders the shareable text of a published article: every live URL numbered
 * in display order, headline excluded so the WhatsApp paste stays clean.
 *
 * @param params.title - Article headline, kept out of the copied text.
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
 * Collapsed URL share block with a copy control and an opt-in URL list.
 *
 * @param props.title - Article headline used for the list label.
 * @param props.urls - Live URLs; the block renders nothing when empty.
 * @returns The count, copy button, and expand toggle, plus the list only when opened.
 * @remarks The list stays hidden by default so a card with thousands of portals
 * takes one compact row; the copy always carries the full numbered list.
 */
export function PublishedUrlBlock({
  title,
  urls,
}: {
  readonly title: string;
  readonly urls: readonly string[];
}) {
  const [isCopied, setIsCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const listId = useId();
  if (urls.length === 0) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(formatPublishedUrlBlock({ urls }));
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
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="xs"
            aria-expanded={isOpen}
            aria-controls={listId}
            onClick={() => { setIsOpen((open) => !open); }}
          >
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
            <span>{isOpen ? 'Sembunyikan' : 'Lihat URL'}</span>
          </Button>
          <Button type="button" variant="outline" size="xs" onClick={() => { void copy(); }}>
            <ClipboardCopy className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{isCopied ? 'Tersalin' : 'Salin untuk WhatsApp'}</span>
          </Button>
        </div>
      </div>
      {isOpen ? (
        <pre
          id={listId}
          aria-label={`Daftar URL untuk ${title}`}
          className="max-h-72 overflow-auto whitespace-pre-wrap break-all rounded border border-hairline bg-bg p-2.5 font-mono text-[11px] leading-relaxed text-paper"
        >
          <code>{formatPublishedUrlBlock({ urls })}</code>
        </pre>
      ) : null}
    </div>
  );
}
