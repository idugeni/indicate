import Form from 'next/form';
import { Search } from 'lucide-react';

import type { NetworkArticle } from '@/modules/delivery/models';
import { DarkNavyPicks } from '@/modules/site/components/network/templates/dark-navy/cards/picks';

export function DarkNavySearchForm({ query }: { readonly query: string }) {
  return (
    <section aria-label="Pencarian berita" className="rounded-2xl bg-[#0e1a33] p-5 shadow-sm ring-1 ring-[#1b2c4f]/60 sm:p-6">
      <h1 className="m-0 flex items-center gap-2.5 font-sans text-xl font-extrabold tracking-tight text-[#eaf0fb]">
        <span aria-hidden="true" className="h-1 w-8 rounded-full bg-[#2f7bff]" />
        {query === '' ? 'Pencarian Berita' : `Hasil untuk “${query}”`}
      </h1>
      <Form className="mt-4" action="/search" role="search">
        <label htmlFor="dark-navy-search" className="sr-only">
          Cari berita
        </label>
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <div className="relative flex-1">
            <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5f6f8c]" />
            <input
              id="dark-navy-search"
              name="q"
              defaultValue={query}
              maxLength={120}
              autoComplete="off"
              placeholder="Ketik kata kunci…"
              className="h-11 w-full rounded-full border border-[#1b2c4f] bg-[#070f22] pl-11 pr-4 font-sans text-sm text-[#eaf0fb] placeholder:text-[#5f6f8c] focus:border-[#2f7bff] focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="inline-flex h-11 flex-none items-center justify-center rounded-full bg-[#2f7bff] px-6 font-sans text-sm font-bold text-white transition-colors hover:bg-[#1a5fd0]"
          >
            Cari
          </button>
        </div>
      </Form>
    </section>
  );
}

export function DarkNavySearchResults({ articles, query }: { readonly articles: readonly NetworkArticle[]; readonly query: string }) {
  if (articles.length === 0) {
    return (
      <div role="status" className="rounded-2xl border border-dashed border-[#1b2c4f] bg-[#0e1a33] p-8 text-center sm:p-12">
        <h2 className="m-0 font-sans text-xl font-bold text-[#eaf0fb]">
          Tidak ada hasil
        </h2>
        <p className="m-0 mx-auto mt-2 max-w-md font-sans text-sm leading-relaxed text-[#9aa9c4]">
          {query === ''
            ? 'Ketik kata kunci pada kolom di atas untuk mencari berita.'
            : `Tidak ada berita yang cocok dengan “${query}”. Coba kata kunci lain.`}
        </p>
      </div>
    );
  }
  return (
    <DarkNavyPicks
      articles={articles}
      heading={query === '' ? 'Jelajahi Berita' : `Hasil untuk “${query}”`}
      description={`${articles.length} artikel ditemukan`}
      linkHref={null}
    />
  );
}
