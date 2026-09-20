import Form from 'next/form';
import { Search } from 'lucide-react';

import type { ArticleListItem } from '@/modules/delivery/models';
import { PurpleEditorialPicks } from '@/modules/site/components/network/templates/purple-editorial/cards/picks';

export function PurpleEditorialSearchForm({ query }: { readonly query: string }) {
  return (
    <section aria-label="Pencarian berita" className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/60 sm:p-6">
      <h1 className="m-0 flex items-center gap-2.5 font-sans text-xl font-extrabold tracking-tight text-slate-900">
        <span aria-hidden="true" className="h-1 w-8 rounded-full bg-[#7c3aed]" />
        {query === '' ? 'Pencarian Berita' : `Hasil untuk “${query}”`}
      </h1>
      <Form className="mt-4" action="/search" role="search">
        <label htmlFor="purple-editorial-search" className="sr-only">
          Cari berita
        </label>
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <div className="relative flex-1">
            <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="purple-editorial-search"
              name="q"
              defaultValue={query}
              maxLength={120}
              autoComplete="off"
              placeholder="Ketik kata kunci…"
              className="h-11 w-full appearance-none rounded-full border border-slate-200 bg-[#f8f7ff] pl-11 pr-4 font-sans text-base text-slate-900 placeholder:text-slate-400 focus:border-[#7c3aed] focus:outline-none sm:text-sm"
            />
          </div>
          <button
            type="submit"
            className="inline-flex h-11 flex-none items-center justify-center rounded-full bg-[#7c3aed] px-6 font-sans text-sm font-bold text-white transition-colors hover:bg-[#5f21d6]"
          >
            Cari
          </button>
        </div>
      </Form>
    </section>
  );
}

export function PurpleEditorialSearchResults({ articles, query }: { readonly articles: readonly ArticleListItem[]; readonly query: string }) {
  if (articles.length === 0) {
    return (
      <div role="status" className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center sm:p-12">
        <h2 className="m-0 font-sans text-xl font-bold text-slate-900">
          Tidak ada hasil
        </h2>
        <p className="m-0 mx-auto mt-2 max-w-md font-sans text-sm leading-relaxed text-slate-600">
          {query === ''
            ? 'Ketik kata kunci pada kolom di atas untuk mencari berita.'
            : `Tidak ada berita yang cocok dengan “${query}”. Coba kata kunci lain.`}
        </p>
      </div>
    );
  }
  return (
    <PurpleEditorialPicks
      articles={articles}
      heading={query === '' ? 'Jelajahi Berita' : `Hasil untuk “${query}”`}
      description={`${articles.length} artikel ditemukan`}
      linkHref={null}
    />
  );
}
