'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * Pil search di navbar: klik → kolom input mengembang ke kiri;
 * submit → menuju halaman /search?q=... Tombol × menutup kembali.
 */
export function CleanBlueSearchToggle() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const show = () => {
    setOpen(true);
    window.requestAnimationFrame(() => inputRef.current?.focus());
  };

  const hide = () => {
    setOpen(false);
    setValue('');
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = value.trim().slice(0, 120);
    router.push(query === '' ? '/search' : `/search?q=${encodeURIComponent(query)}`);
  };

  if (!open) {
    return (
      <button
        type="button"
        aria-label="Cari berita"
        aria-expanded={false}
        onClick={show}
        className="flex h-10 flex-none items-center gap-2 rounded-full bg-[#1a5fd0] px-4 font-sans text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#155cb8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1a5fd0]"
      >
        <Search className="h-4 w-4" aria-hidden="true" />
        Cari
      </button>
    );
  }

  return (
    <form
      role="search"
      onSubmit={submit}
      aria-expanded={true}
      className="absolute top-1/2 right-4 z-20 flex w-[min(19rem,calc(100vw-2rem))] flex-none -translate-y-1/2 items-center gap-1 rounded-full border border-slate-200 bg-white py-1 pr-1 pl-4 shadow-xl sm:right-6"
    >
      <label htmlFor="clean-blue-nav-search" className="sr-only">
        Cari berita
      </label>
      <Input
        ref={inputRef}
        id="clean-blue-nav-search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') hide();
        }}
        maxLength={120}
        autoComplete="off"
        placeholder="Ketik kata kunci…"
        className="h-10 min-w-0 flex-1 rounded-full border-0 bg-transparent px-0 font-sans text-sm shadow-none focus-visible:ring-0"
      />
      <Button
        type="submit"
        size="icon"
        aria-label="Cari"
        className="h-10 w-10 flex-none rounded-full bg-[#1a5fd0] text-white hover:bg-[#155cb8]"
      >
        <Search className="h-4 w-4" aria-hidden="true" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Tutup pencarian"
        onClick={hide}
        className="h-10 w-10 flex-none rounded-full text-slate-400 hover:text-slate-700"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </Button>
    </form>
  );
}
