'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';

import {
  FaqAccordion,
  groupFaqItems,
  slugify,
  type FaqGridItem,
} from '@/modules/site/components/layout/content';

/**
 * Renders topic chips plus the FAQ search box above grouped accordions.
 *
 * @param items - Full normalized FAQ list; the unfiltered render stays server-crawlable.
 * @returns Chips, search field with live result count, and per-topic accordions.
 */
export function FaqBrowser({ items }: { readonly items: readonly FaqGridItem[] }) {
  const [query, setQuery] = useState('');
  const topics = useMemo(() => groupFaqItems(items), [items]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle === '') return items;
    return items.filter((item) => `${item.question} ${item.answer}`.toLowerCase().includes(needle));
  }, [items, query]);
  const groups = useMemo(() => groupFaqItems(filtered), [filtered]);

  return (
    <div>
      {topics.length > 1 ? (
        <nav aria-label="Topik pertanyaan" className="mx-auto flex w-full max-w-3xl flex-wrap items-center gap-2">
          {topics.map((topic) => (
            <a
              key={topic.category}
              href={`#topik-${slugify(topic.category)}`}
              className="rounded-full border border-[#e2ded2] bg-white px-4 py-2 font-sans text-xs font-semibold text-[#4c5b6b] transition-colors duration-180 hover:border-[#b88d3a]/70 hover:text-[#1a2430]"
            >
              {topic.category}
              <span className="ml-1.5 font-mono text-[11px] tabular-nums text-[#8a5f1c]">{topic.items.length}</span>
            </a>
          ))}
        </nav>
      ) : null}
      <div className="mx-auto mt-6 w-full max-w-3xl">
        <label
          htmlFor="faq-search"
          className="flex items-center gap-2.5 rounded-[3px] border border-[#e2ded2] bg-white px-4 py-3 transition-colors duration-180 focus-within:border-[#b88d3a]/70 hover:border-[#b88d3a]/50"
        >
          <Search className="h-4 w-4 flex-none text-[#8a5f1c]" aria-hidden="true" />
          <span className="sr-only">Cari jawaban</span>
          <input
            id="faq-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari jawaban, mis. domain, biaya, aktivasi…"
            autoComplete="off"
            className="w-full bg-transparent font-sans text-sm text-[#1a2430] outline-none placeholder:text-[#5f6b7a]/70"
          />
        </label>
        <p aria-live="polite" className="m-0 mt-2 font-mono text-[11px] tabular-nums tracking-wide text-[#5f6b7a]">
          {query.trim() === ''
            ? `${items.length} jawaban dalam ${topics.length} topik`
            : `${filtered.length} dari ${items.length} jawaban cocok`}
        </p>
      </div>
      <div className="mt-10 grid gap-12">
        {groups.map((group) => (
          <section key={group.category} id={`topik-${slugify(group.category)}`} aria-label={group.category} className="scroll-mt-28">
            <div className="mx-auto mb-5 flex w-full max-w-3xl items-baseline justify-between gap-4">
              <h2 className="m-0 font-sans text-xl font-bold tracking-tight text-[#1a2430]">{group.category}</h2>
              <p className="m-0 font-mono text-[11px] tabular-nums tracking-wide text-[#5f6b7a]">
                {group.items.length} jawaban
              </p>
            </div>
            <FaqAccordion items={group.items} />
          </section>
        ))}
        {groups.length === 0 ? (
          <div className="mx-auto w-full max-w-3xl rounded-[3px] border border-[#e2ded2] bg-white px-5 py-8 text-center sm:px-6">
            <p className="m-0 font-sans text-sm font-bold text-[#1a2430]">Tidak ada jawaban yang cocok.</p>
            <p className="m-0 mt-1.5 font-sans text-sm leading-relaxed text-[#4c5b6b]">
              Coba kata kunci lain, atau hubungi tim kami langsung.
            </p>
            <button
              type="button"
              onClick={() => setQuery('')}
              className="mt-4 inline-flex h-9 items-center bg-[#1a2430] px-4 font-sans text-xs font-semibold text-white transition-colors duration-180 hover:bg-[#2b3a4b]"
            >
              Tampilkan semua jawaban
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
