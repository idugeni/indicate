'use client';

import { useMemo, useState } from 'react';
import { ArrowUpRight, MapPin, Search } from 'lucide-react';
import type { DirectoryEntry } from '@/modules/content/site-content';
import { accentEdgeStyle, accentForHostname, capDirectoryResults, filterSites, groupRegionalByCity, patternForHostname, wordmarkPatternForHostname } from '@/modules/site/components/directory/directory-helpers';
import { Wordmark } from '@/modules/site/components/directory/wordmark';
import { cn } from '@/ui/cn';

type Scope = 'all' | 'main' | 'regional';

const SCOPES: readonly { readonly value: Scope; readonly label: string }[] = Object.freeze([
  { value: 'all', label: 'Semua' },
  { value: 'main', label: 'Portal utama' },
  { value: 'regional', label: 'Edisi daerah' },
]);

/**
 * Interactive network directory: search plus edition-scope filter over the
 * live portal listing, rendered as a wordmark board and a regional ledger.
 *
 * @param sites - Active portals ordered by hostname; regional rows carry no copy.
 * @remarks Browsing stays aggregated: apex portals get a card, regional editions
 * collapse into one tile per city. Searching switches to linkable result cards
 * so a regional portal is reachable, capped at `DIRECTORY_RESULT_LIMIT` with the
 * withheld count stated rather than hidden.
 */
export function NetworkExplorer({ sites }: { readonly sites: readonly DirectoryEntry[] }) {
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<Scope>('all');
  const results = useMemo(() => filterSites(sites, query, scope), [sites, query, scope]);
  const searching = query.trim() !== '';
  const capped = useMemo(() => capDirectoryResults(results), [results]);
  const cards = useMemo(
    () => (searching ? capped.shown : results.filter((site) => site.siteLevel === 'apex')),
    [searching, capped.shown, results],
  );
  const cityGroups = useMemo(
    () => (searching ? [] : groupRegionalByCity(results.filter((site) => site.siteLevel !== 'apex'))),
    [searching, results],
  );
  const apexCount = useMemo(() => results.filter((site) => site.siteLevel === 'apex').length, [results]);
  const cityCount = useMemo(
    () => groupRegionalByCity(results.filter((site) => site.siteLevel !== 'apex')).length,
    [results],
  );

  return (
    <div>
      <div className="border-y border-[#e2ded2] bg-[#f4f2ec] py-4">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-6 sm:flex-row sm:items-center">
          <label className="relative block flex-1">
            <span className="sr-only">Cari portal</span>
            <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#5f6b7a]" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari nama, domain, atau topik…"
              className="w-full rounded-[3px] border border-[#1a2430]/15 bg-white py-2.5 pr-4 pl-10 font-sans text-sm text-[#1a2430] placeholder:text-[#5f6b7a]/70 focus:border-[#b88d3a] focus:outline-2 focus:outline-[#b88d3a]"
            />
          </label>
          <div role="group" aria-label="Lingkup edisi" className="flex flex-none gap-1 rounded-[3px] border border-[#1a2430]/15 bg-white p-1">
            {SCOPES.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={scope === option.value}
                onClick={() => setScope(option.value)}
                className={cn(
                  'rounded-[2px] px-3.5 py-1.5 font-sans text-[13px] font-semibold transition-colors duration-180',
                  scope === option.value ? 'bg-[#1a2430] text-white' : 'text-[#4c5b6b] hover:bg-[#1a2430]/5 hover:text-[#1a2430]',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div aria-live="polite" className="mx-auto w-full max-w-6xl px-6 pt-10 md:pt-12">
        <dl className="m-0 flex flex-wrap items-stretch justify-center gap-x-10 gap-y-6 p-0 sm:gap-x-14">
          {[
            { value: results.length, label: 'Portal' },
            { value: apexCount, label: 'Utama' },
            { value: cityCount, label: 'Daerah' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="grid min-w-24 justify-items-center gap-1.5 border-[#e2ded2] text-center sm:border-l sm:pl-10 sm:first:border-l-0 sm:first:pl-0"
            >
              <dd className="m-0 font-serif text-5xl font-semibold tracking-tight text-[#1a2430] tabular-nums md:text-6xl">
                {stat.value}
              </dd>
              <dt className="m-0 font-mono text-[11px] tracking-[0.22em] text-[#5f6b7a] uppercase">
                {stat.label}
              </dt>
              <span aria-hidden="true" className="mt-1 h-1 w-8 bg-[#b88d3a]" />
            </div>
          ))}
        </dl>
      </div>

      {results.length === 0 ? (
        <div className="mx-auto w-full max-w-6xl px-6 pt-10 pb-16 text-center md:pt-12 md:pb-24">
          <p className="m-0 font-serif text-2xl tracking-tight text-[#1a2430]">Tidak ada portal yang cocok.</p>
          <p className="m-0 mt-2 font-sans text-sm text-[#4c5b6b]">Coba kata kunci lain atau kembalikan lingkup ke Semua.</p>
        </div>
      ) : (
        <>
          {cards.length > 0 ? (
            <div className={cn('mt-10 w-full px-4 sm:px-6 md:mt-12 lg:px-8', !searching && cityGroups.length === 0 && 'pb-16 md:pb-24')}>
              {searching ? (
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                  <p className="m-0 flex-none font-mono text-[11px] tracking-[0.14em] text-[#5f6b7a] uppercase">
                    Hasil pencarian
                  </p>
                  <span aria-hidden="true" className="h-px flex-1 bg-[#e2ded2]" />
                </div>
              ) : null}
              <ul className="m-0 grid list-none gap-px overflow-hidden rounded-[3px] border border-[#e2ded2] bg-[#e2ded2] p-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {cards.map((site) => {
                  const accent = accentForHostname(site.hostname);
                  const regional = site.siteLevel !== 'apex';
                  const subline = regional ? site.areaName : site.tagline;
                  return (
                    <li key={site.hostname} className="group relative flex bg-white transition-colors duration-180 hover:bg-[#faf9f5]">
                      <span aria-hidden="true" className="w-1 flex-none" style={accentEdgeStyle(accent, patternForHostname(site.hostname))} />
                      <a
                        href={`https://${site.hostname}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Buka portal ${site.siteName}`}
                        className="relative flex flex-1 flex-col gap-2 p-6 outline-offset-[-2px] focus-visible:outline-2 focus-visible:outline-[#b88d3a] xl:p-7"
                      >
                        <span className="pr-8 text-2xl md:text-3xl xl:text-[1.65rem]">
                          <Wordmark name={site.siteName} accent={accent} pattern={wordmarkPatternForHostname(site.hostname)} />
                        </span>
                        {subline !== null && subline !== undefined && subline.trim() !== '' ? (
                          <span className="block font-sans text-[13px] font-semibold" style={{ color: accent }}>
                            {subline}
                          </span>
                        ) : null}
                        {site.description !== null ? (
                          <span className="block font-sans text-sm leading-relaxed text-[#4c5b6b]">
                            {site.description}
                          </span>
                        ) : (
                          <span className="block font-mono text-[11px] text-[#5f6b7a]">
                            {site.hostname}
                          </span>
                        )}
                        <ArrowUpRight aria-hidden="true" className="absolute top-6 right-5 hidden h-4 w-4 text-[#e2ded2] transition-all duration-180 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#8a5f1c] sm:block" />
                      </a>
                    </li>
                  );
                })}
              </ul>
              {capped.hidden > 0 ? (
                <p className="mx-auto mt-4 max-w-6xl px-2 text-center font-sans text-[13px] text-[#4c5b6b]">
                  {capped.hidden.toLocaleString('id-ID')} portal lain cocok. Persempit kata kunci atau pilih lingkup lain untuk melihatnya.
                </p>
              ) : null}
            </div>
          ) : null}

          {!searching && cityGroups.length > 0 ? (
            <div className="mx-auto mt-16 w-full max-w-6xl px-6 pb-16 md:mt-24 md:pb-24">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <p className="m-0 flex-none font-mono text-[11px] tracking-[0.14em] text-[#5f6b7a] uppercase">
                  Edisi daerah
                </p>
                <span aria-hidden="true" className="h-px flex-1 bg-[#e2ded2]" />
                <span className="flex-none rounded-[3px] border border-[#b88d3a]/40 bg-[#b88d3a]/[0.08] px-2 py-1 font-mono text-[10px] tracking-[0.12em] text-[#8a5f1c] uppercase">
                  {cityGroups.length} kota
                </span>
              </div>
              <ul className="m-0 mt-6 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
                {cityGroups.map((group) => {
                  const cityAccent = accentForHostname(group.city);
                  return (
                  <li
                    key={group.city}
                    className="flex items-center gap-4 rounded-[3px] border border-[#e2ded2] bg-white px-5 py-4 sm:px-6"
                  >
                    <span aria-hidden="true" className="flex h-9 w-9 flex-none items-center justify-center rounded-[3px] border" style={{ borderColor: `${cityAccent}66`, backgroundColor: `${cityAccent}14`, color: cityAccent }}>
                      <MapPin className="h-4 w-4" />
                    </span>
                    <span className="grid min-w-0 flex-1">
                      <span className="truncate font-serif text-2xl font-semibold tracking-tight text-[#1a2430]">
                        {group.city}
                      </span>
                      <span className="font-mono text-[11px] text-[#5f6b7a] tabular-nums">
                        {group.items.length} portal
                      </span>
                    </span>
                  </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
