'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * Ikon search di navbar: klik → kolom input mengembang ke kiri;
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

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = value.trim().slice(0, 120);
    router.push(query === '' ? '/search' : `/search?q=${encodeURIComponent(query)}`);
  };

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Cari berita"
        onClick={show}
        className="rounded-full border-slate-200 bg-white text-slate-600 hover:text-[#1a5fd0]"
      >
        <Search className="h-4 w-4" aria-hidden="true" />
      </Button>
    );
  }

  return (
    <form
      role="search"
      onSubmit={submit}
      className="flex w-48 items-center gap-1.5 transition-[width] duration-200 sm:w-64"
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
          if (event.key === 'Escape') setOpen(false);
        }}
        maxLength={120}
        autoComplete="off"
        placeholder="Ketik kata kunci…"
        className="h-9 rounded-full border-slate-200 bg-white font-sans text-sm"
      />
      <Button
        type="submit"
        size="icon"
        aria-label="Cari"
        className="h-9 w-9 flex-none rounded-full bg-[#1a5fd0] text-white hover:bg-[#155cb8]"
      >
        <Search className="h-4 w-4" aria-hidden="true" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Tutup pencarian"
        onClick={() => setOpen(false)}
        className="h-9 w-9 flex-none rounded-full text-slate-400 hover:text-slate-700"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </Button>
    </form>
  );
}
