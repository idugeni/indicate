'use client';

import { useMemo, useState } from 'react';
import { BadgeCheck, Search } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { PartnerRow } from '@/modules/content/site-content';
import { accentEdgeStyle, accentForHostname, ALL_PARTNER_FAMILIES, filterPartners, patternForHostname } from '@/modules/site/components/directory/directory-helpers';

/**
 * Interactive partner directory: free-text search over the live
 * subscribed-organization listing, rendered as one global ledger.
 *
 * @param partners - Subscribed customer organizations ordered by name.
 */
export function PartnersExplorer({ partners }: { readonly partners: readonly PartnerRow[] }) {
  const [query, setQuery] = useState('');
  const results = useMemo(() => filterPartners(partners, query, ALL_PARTNER_FAMILIES), [partners, query]);

  return (
    <div>
      <div className="border-y border-[#e2ded2] bg-[#f4f2ec] py-4">
        <div className="mx-auto w-full max-w-6xl px-6">
          <label className="relative block w-full">
            <span className="sr-only">Cari partner</span>
            <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#5f6b7a]" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari nama organisasi…"
              className="w-full rounded-[3px] border border-[#1a2430]/15 bg-white py-2.5 pr-4 pl-10 font-sans text-sm text-[#1a2430] placeholder:text-[#5f6b7a]/70 focus:border-[#b88d3a] focus:outline-2 focus:outline-[#b88d3a]"
            />
          </label>
        </div>
      </div>

      <div aria-live="polite" className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-5 gap-y-3 px-6 pt-10 md:pt-12">
        <p className="m-0 font-serif text-5xl font-semibold tracking-tight text-[#1a2430] tabular-nums md:text-6xl">
          {results.length}
        </p>
        <p className="m-0 font-mono text-[11px] tracking-[0.14em] text-[#5f6b7a] uppercase">
          partner berlangganan aktif
        </p>
        <Separator className="min-w-24 flex-1 bg-[#e2ded2]" />
      </div>

      {results.length === 0 ? (
        <div className="mx-auto w-full max-w-6xl px-6 pt-10 pb-16 text-center md:pt-12 md:pb-24">
          <p className="m-0 font-serif text-2xl tracking-tight text-[#1a2430]">Tidak ada partner yang cocok.</p>
          <p className="m-0 mt-2 font-sans text-sm text-[#4c5b6b]">Coba kata kunci lain.</p>
        </div>
      ) : (
        <div className="mx-auto mt-10 w-full max-w-6xl px-6 pb-16 md:mt-12 md:pb-24">
          <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-4">
            {results.map((partner) => {
              const accent = accentForHostname(partner.slug);
              return (
              <li key={partner.slug} className="h-full min-w-0">
                <Card size="sm" className="relative h-full gap-0 overflow-hidden rounded-[3px] border-[#e2ded2] bg-gradient-to-br from-[#f6f3ea] via-[#ece3cf] to-[#e0d3b8] py-0 shadow-none">
                  <span aria-hidden="true" className="absolute -top-10 -left-10 h-28 w-28 rounded-full" style={{ backgroundColor: `${accent}4D` }} />
                  <span aria-hidden="true" className="absolute -right-8 -bottom-10 h-32 w-32 rounded-full bg-[#1a2430]/10" />
                  <CardContent className="relative m-3 flex flex-1 flex-col items-center gap-2.5 rounded-[3px] border border-white/90 bg-white/65 px-4 py-0 pb-5 text-center shadow-[0_16px_40px_rgba(26,36,48,0.15)]">
                    <span aria-hidden="true" className="h-1.5 w-full flex-none rounded-full" style={accentEdgeStyle(accent, patternForHostname(partner.slug))} />
                    <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-[3px] border" style={{ borderColor: `${accent}66`, backgroundColor: `${accent}14`, color: accent }}>
                      <BadgeCheck aria-hidden="true" className="h-4 w-4" />
                    </span>
                    <span className="line-clamp-2 min-h-12 font-serif text-[17px] leading-snug font-semibold tracking-tight text-balance text-[#1a2430]">
                      {partner.name}
                    </span>
                    <Badge variant="outline" className="border font-mono text-[10px] font-semibold tracking-[0.08em] uppercase" style={{ borderColor: `${accent}55`, backgroundColor: `${accent}14`, color: '#1a2430' }}>
                      Aktif
                    </Badge>
                  </CardContent>
                </Card>
              </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
