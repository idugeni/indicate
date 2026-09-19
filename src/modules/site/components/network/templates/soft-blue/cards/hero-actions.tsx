'use client';

import { useState } from 'react';
import { Bookmark, Check, Share2 } from 'lucide-react';

/** Aksi hero: simpan lokal + bagikan (Web Share API, fallback salin tautan). */
export function SoftBlueHeroActions({ slug, title }: { readonly slug: string; readonly title: string }) {
  const [saved, setSaved] = useState(() => {
    try {
      return typeof window !== 'undefined' && window.localStorage.getItem(`soft-blue:bookmark:${slug}`) === '1';
    } catch {
      return false;
    }
  });
  const [copied, setCopied] = useState(false);

  const toggleSave = () => {
    const next = !saved;
    try {
      window.localStorage.setItem(`soft-blue:bookmark:${slug}`, next ? '1' : '0');
    } catch {
      /* mode privat: status simpan hanya sesi ini */
    }
    setSaved(next);
  };

  const share = async () => {
    const url = `${window.location.origin}/${slug}`;
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text: title, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const area = document.createElement('textarea');
      area.value = url;
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      document.body.removeChild(area);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const button =
    'flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-600 ring-1 ring-slate-200 transition-colors hover:text-[#2563eb] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563eb]';

  return (
    <p className="m-0 flex flex-none items-center gap-2">
      <button
        type="button"
        onClick={toggleSave}
        aria-pressed={saved}
        aria-label={saved ? 'Hapus dari simpanan' : 'Simpan artikel'}
        title={saved ? 'Tersimpan' : 'Simpan artikel'}
        className={`${button} ${saved ? '!bg-[#2563eb] !text-white !ring-[#2563eb]' : ''}`}
      >
        <Bookmark className={`h-4 w-4 ${saved ? 'fill-current' : ''}`} aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => void share()}
        aria-label={copied ? 'Tautan tersalin' : 'Bagikan artikel'}
        title={copied ? 'Tersalin!' : 'Bagikan artikel'}
        className={`${button} ${copied ? '!bg-[#2563eb] !text-white !ring-[#2563eb]' : ''}`}
      >
        {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Share2 className="h-4 w-4" aria-hidden="true" />}
      </button>
      <span aria-live="polite" className="sr-only">
        {copied ? 'Tautan artikel tersalin' : ''}
      </span>
    </p>
  );
}
