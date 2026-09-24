'use client';

import { useMemo, useState } from 'react';
import { BadgeCheck, Building2, Search } from 'lucide-react';
import type { PartnerRow } from '@/modules/content/site-content';
import { filterPartners, groupPartners } from '@/modules/site/components/directory/directory-helpers';
import { cn } from '@/ui/cn';

const ALL = 'SEMUA';

/**
 * Interactive partner directory: free-text search plus institution-family
 * chips over the live subscribed-organization listing.
 *
 * @param partners - Subscribed customer organizations ordered by name.
 */
export function PartnersExplorer({ partners }: { readonly partners: readonly PartnerRow[] }) {
  const [query, setQuery] = useState('');
  const [family, setFamily] = useState<string>(ALL);
  const groups = useMemo(() => groupPartners(partners), [partners]);
  const visibleFamilies = useMemo(() => groups.map((group) => group.family), [groups]);
  const results = useMemo(() => filterPartners(partners, query, family), [partners, query, family]);
  const resultGroups = useMemo(() => groupPartners(results), [results]);

  return (
    <div>
      <div className="border-y border-[#e2ded2] bg-[#f4f2ec] py-4">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-6">
          <label className="relative block">
            <span className="sr-only">Cari partner</span>
            <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#5f6b7a]" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari nama unit kerja…"
              className="w-full rounded-[3px] border border-[#1a2430]/15 bg-white py-2.5 pr-4 pl-10 font-sans text-sm text-[#1a2430] placeholder:text-[#5f6b7a]/70 focus:border-[#b88d3a] focus:outline-2 focus:outline-[#b88d3a]"
            />
          </label>
          <div role="group" aria-label="Keluarga institusi" className="flex flex-wrap gap-1.5">
            {[ALL, ...visibleFamilies].map((option) => {
              const count = option === ALL
                ? partners.length
                : (groups.find((group) => group.family === option)?.items.length ?? 0);
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={family === option}
                  onClick={() => setFamily(option)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-[3px] border px-3 py-1.5 font-mono text-[11px] font-semibold tracking-[0.08em] uppercase transition-colors duration-180',
                    family === option
                      ? 'border-[#1a2430] bg-[#1a2430] text-white'
                      : 'border-[#1a2430]/15 bg-white text-[#4c5b6b] hover:border-[#1a2430]/30 hover:text-[#1a2430]',
                  )}
                >
                  {option === ALL ? 'Semua' : option}
                  <span aria-hidden="true" className={cn('tabular-nums', family === option ? 'text-[#e8c87a]' : 'text-[#8a5f1c]')}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <p aria-live="polite" className="mx-auto w-full max-w-6xl px-6 pt-10 md:pt-12 font-mono text-[11px] tracking-[0.14em] text-[#5f6b7a] uppercase">
        {results.length} partner berlangganan aktif
      </p>

      {results.length === 0 ? (
        <div className="mx-auto w-full max-w-6xl px-6 pt-10 pb-16 text-center md:pt-12 md:pb-24">
          <p className="m-0 font-serif text-2xl tracking-tight text-[#1a2430]">Tidak ada partner yang cocok.</p>
          <p className="m-0 mt-2 font-sans text-sm text-[#4c5b6b]">Coba kata kunci lain atau pilih keluarga institusi yang berbeda.</p>
        </div>
      ) : (
        <div className="mx-auto mt-10 grid w-full max-w-6xl gap-10 px-6 pb-16 md:mt-12 md:pb-24 sm:grid-cols-2">
          {resultGroups.map((group) => (
            <section key={group.family} aria-label={`Partner ${group.family}`}>
              <div className="flex items-center gap-3 border-b-2 border-[#1a2430]/10 pb-3">
                <span aria-hidden="true" className="flex h-9 w-9 flex-none items-center justify-center rounded-[3px] border border-[#b88d3a]/40 bg-[#b88d3a]/[0.08] text-[#8a5f1c]">
                  <Building2 className="h-4 w-4" />
                </span>
                <h3 className="m-0 font-sans text-lg font-extrabold tracking-tight text-[#1a2430]">
                  {group.family}
                </h3>
                <span className="ml-auto flex-none font-mono text-[11px] text-[#5f6b7a] tabular-nums">
                  {group.items.length} unit
                </span>
              </div>
              <ul className="m-0 grid list-none gap-2.5 p-0 pt-4">
                {group.items.map((partner) => (
                  <li
                    key={partner.slug}
                    className="group flex items-start gap-3 rounded-[3px] border border-[#e2ded2] bg-white px-4 py-3 transition-colors duration-180 hover:border-[#b88d3a]/70 hover:bg-[#faf9f5]"
                  >
                    <BadgeCheck aria-hidden="true" className="mt-0.5 h-4 w-4 flex-none text-[#2f4a3e]" />
                    <span className="grid min-w-0 flex-1 gap-0.5">
                      <span className="font-sans text-sm font-bold tracking-tight text-[#1a2430]">
                        {partner.name}
                      </span>
                      <span className="truncate font-mono text-[11px] text-[#5f6b7a]">
                        {partner.slug}
                      </span>
                    </span>
                    <span className="mt-0.5 flex-none rounded-[3px] bg-[#2f4a3e]/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-[0.08em] text-[#2f4a3e] uppercase">
                      Aktif
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
