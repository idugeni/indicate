'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';

import { SoftBlueGhostButton, SoftBluePrimaryButton } from '@/modules/site/components/network/templates/soft-blue/ui/soft-blue-button';
import { SoftBlueInput } from '@/modules/site/components/network/templates/soft-blue/ui/soft-blue-input';

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
export function SoftBlueSearchPanel({
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
    <div className="ticker-enter border-t border-slate-100 bg-white">
      <form role="search" onSubmit={submit} className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3 sm:px-6">
        <label htmlFor="soft-blue-search" className="sr-only">
          Cari berita
        </label>
        <SoftBlueInput
          ref={inputRef}
          id="soft-blue-search"
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
        <SoftBluePrimaryButton type="submit" className="h-10 flex-none rounded-full px-5 text-sm">
          Cari
        </SoftBluePrimaryButton>
        <SoftBlueGhostButton
          type="button"
          size="icon"
          aria-label="Tutup pencarian"
          onClick={onClose}
          className="h-10 w-10 flex-none rounded-full"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </SoftBlueGhostButton>
      </form>
    </div>
  );
}
