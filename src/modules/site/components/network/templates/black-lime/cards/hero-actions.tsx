'use client';

import { useState } from 'react';
import { Bookmark, Check, Share2 } from 'lucide-react';

/** Aksi hero: simpan lokal + bagikan (Web Share API, fallback salin tautan). */
export function BlackLimeHeroActions({ slug, title }: { readonly slug: string; readonly title: string }) {
  const [saved, setSaved] = useState(() => {
    try {
      return typeof window !== 'undefined' && window.localStorage.getItem(`black-lime:bookmark:${slug}`) === '1';
    } catch {
      return false;
    }
  });
  const [copied, setCopied] = useState(false);

  const toggleSave = () => {
    const next = !saved;
    try {
      window.localStorage.setItem(`black-lime:bookmark:${slug}`, next ? '1' : '0');
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
    'flex h-9 w-9 items-center justify-center rounded-full bg-[#131711] text-[#a3ad9a] ring-1 ring-[#242b1f] transition-colors hover:text-[#c5f82a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c5f82a]';

  return (
    <p className="m-0 flex flex-none items-center gap-2">
      <button
        type="button"
        onClick={toggleSave}
        aria-pressed={saved}
        aria-label={saved ? 'Hapus dari simpanan' : 'Simpan artikel'}
        title={saved ? 'Tersimpan' : 'Simpan artikel'}
        className={`${button} ${saved ? '!bg-[#c5f82a] !text-white !ring-[#c5f82a]' : ''}`}
      >
        <Bookmark className={`h-4 w-4 ${saved ? 'fill-current' : ''}`} aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => void share()}
        aria-label={copied ? 'Tautan tersalin' : 'Bagikan artikel'}
        title={copied ? 'Tersalin!' : 'Bagikan artikel'}
        className={`${button} ${copied ? '!bg-[#c5f82a] !text-white !ring-[#c5f82a]' : ''}`}
      >
        {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Share2 className="h-4 w-4" aria-hidden="true" />}
      </button>
      <span aria-live="polite" className="sr-only">
        {copied ? 'Tautan artikel tersalin' : ''}
      </span>
    </p>
  );
}
