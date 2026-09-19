'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';

import { BlackLimeGhostButton, BlackLimePrimaryButton } from '@/modules/site/components/network/templates/black-lime/ui/black-lime-button';
import { BlackLimeInput } from '@/modules/site/components/network/templates/black-lime/ui/black-lime-input';

/**
 * Panel pencarian expandable di bawah header desktop.
 *
 * @param query - Nilai input terkontrol.
 * @param onQueryChange - Handler perubahan input.
 * @param onClose - Handler tutup panel.
 * @param inputRef - Ref untuk autofocus.
 * @param onFocusReturn - Kembalikan fokus ke tombol pemicu saat tutup.
 * @returns Form pencarian in-flow template.
 */
export function BlackLimeSearchPanel({
  query,
  onQueryChange,
  onClose,
  inputRef,
  onFocusReturn,
}: {
  readonly query: string;
  readonly onQueryChange: (value: string) => void;
  readonly onClose: () => void;
  readonly inputRef: React.RefObject<HTMLInputElement | null>;
  readonly onFocusReturn: () => void;
}) {
  const router = useRouter();
  const wasOpen = useRef(false);

  useEffect(() => {
    wasOpen.current = true;
    const id = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(id);
  }, [inputRef]);

  useEffect(
    () => () => {
      if (wasOpen.current) onFocusReturn();
    },
    [onFocusReturn],
  );

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = query.trim().slice(0, 120);
    router.push(value === '' ? '/search' : `/search?q=${encodeURIComponent(value)}`);
  };

  return (
    <div className="ticker-enter border-t border-[#242b1f] bg-[#0a0c07]">
      <form role="search" onSubmit={submit} className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3 sm:px-6">
        <label htmlFor="black-lime-search" className="sr-only">
          Cari berita
        </label>
        <BlackLimeInput
          ref={inputRef}
          id="black-lime-search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') onClose();
          }}
          maxLength={120}
          autoComplete="off"
          placeholder="Ketik kata kunci…"
          className="h-10 min-w-0 flex-1 rounded-full font-sans text-sm"
        />
        <BlackLimePrimaryButton type="submit" className="h-10 flex-none rounded-full px-5 text-sm">
          Cari
        </BlackLimePrimaryButton>
        <BlackLimeGhostButton
          type="button"
          size="icon"
          aria-label="Tutup pencarian"
          onClick={onClose}
          className="h-10 w-10 flex-none rounded-full"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </BlackLimeGhostButton>
      </form>
    </div>
  );
}
