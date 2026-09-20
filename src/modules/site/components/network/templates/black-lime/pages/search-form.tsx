import Form from 'next/form';
import { Search } from 'lucide-react';

import type { ArticleListItem } from '@/modules/delivery/models';
import { BlackLimePicks } from '@/modules/site/components/network/templates/black-lime/cards/picks';

export function BlackLimeSearchForm({ query }: { readonly query: string }) {
  return (
    <section aria-label="Pencarian berita" className="rounded-2xl bg-[#131711] p-5 shadow-sm ring-1 ring-[#242b1f]/60 sm:p-6">
      <h1 className="m-0 flex items-center gap-2.5 font-sans text-xl font-extrabold tracking-tight text-[#f2f5e9]">
        <span aria-hidden="true" className="h-1 w-8 rounded-full bg-[#c5f82a]" />
        {query === '' ? 'Pencarian Berita' : `Hasil untuk “${query}”`}
      </h1>
      <Form className="mt-4" action="/search" role="search">
        <label htmlFor="black-lime-search" className="sr-only">
          Cari berita
        </label>
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <div className="relative flex-1">
            <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#646b5e]" />
            <input
              id="black-lime-search"
              name="q"
              defaultValue={query}
              maxLength={120}
              autoComplete="off"
              placeholder="Ketik kata kunci…"
              className="h-11 w-full appearance-none rounded-full border border-[#242b1f] bg-[#0a0c07] pl-11 pr-4 font-sans text-base text-[#f2f5e9] placeholder:text-[#646b5e] focus:border-[#c5f82a] focus:outline-none sm:text-sm"
            />
          </div>
          <button
            type="submit"
            className="inline-flex h-11 flex-none items-center justify-center rounded-full bg-[#c5f82a] px-6 font-sans text-sm font-bold text-white transition-colors hover:bg-[#9ecb14]"
          >
            Cari
          </button>
        </div>
      </Form>
    </section>
  );
}

export function BlackLimeSearchResults({ articles, query }: { readonly articles: readonly ArticleListItem[]; readonly query: string }) {
  if (articles.length === 0) {
    return (
      <div role="status" className="rounded-2xl border border-dashed border-[#242b1f] bg-[#131711] p-8 text-center sm:p-12">
        <h2 className="m-0 font-sans text-xl font-bold text-[#f2f5e9]">
          Tidak ada hasil
        </h2>
        <p className="m-0 mx-auto mt-2 max-w-md font-sans text-sm leading-relaxed text-[#a3ad9a]">
          {query === ''
            ? 'Ketik kata kunci pada kolom di atas untuk mencari berita.'
            : `Tidak ada berita yang cocok dengan “${query}”. Coba kata kunci lain.`}
        </p>
      </div>
    );
  }
  return (
    <BlackLimePicks
      articles={articles}
      heading={query === '' ? 'Jelajahi Berita' : `Hasil untuk “${query}”`}
      description={`${articles.length} artikel ditemukan`}
      linkHref={null}
    />
  );
}
