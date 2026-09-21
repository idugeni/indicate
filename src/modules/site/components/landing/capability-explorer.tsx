'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { CAPABILITIES } from '@/ui/site/marketing-content';
import { CAPABILITY_ICONS, withIcons } from '@/modules/site/components/layout/content';
import { Eyebrow, GLASS_ELEVATED } from '@/modules/site/components/landing/material';
import { cn } from '@/ui/cn';

const capabilities = withIcons(CAPABILITIES, CAPABILITY_ICONS);

/**
 * Render the interactive two-column platform capability explorer.
 *
 * @returns Capability list section with a swapping detail panel.
 */
export function CapabilityExplorer() {
  const [active, setActive] = useState(0);
  const current = capabilities[active] ?? capabilities[0];
  if (!current) return null;
  return (
    <section aria-labelledby="kemampuan-heading" className="border-b border-[#e2ded2]">
      <div className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-8 md:py-24">
        <div className="max-w-3xl">
          <Eyebrow index="03">Kemampuan platform</Eyebrow>
          <h2
            id="kemampuan-heading"
            className="m-0 mt-4 font-serif text-3xl leading-[1.05] font-medium tracking-tight text-balance sm:text-[2.75rem]"
          >
            Satu dasbor untuk <em className="text-[#8a5f1c]">seluruh kerja</em> redaksi.
          </h2>
        </div>
        <div className="mt-12 grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5" role="tablist" aria-orientation="vertical" aria-label="Daftar kemampuan platform">
            {capabilities.map((item, index) => {
              const selected = index === active;
              return (
                <button
                  key={item.title}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setActive(index)}
                  className={cn(
                    'group flex w-full items-baseline gap-4 border-b border-[#1a2430]/15 py-4 text-left transition-colors duration-180 first:border-t',
                    selected ? 'text-[#1a2430]' : 'text-[#4c5b6b] hover:text-[#1a2430]',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'font-mono text-[11px] tabular-nums',
                      selected ? 'text-[#8a5f1c]' : 'text-[#b3aca0] group-hover:text-[#8a5f1c]',
                    )}
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span
                    className={cn(
                      'flex-1 font-serif text-xl leading-snug tracking-tight transition-transform duration-180',
                      selected ? 'translate-x-1 font-medium' : 'group-hover:translate-x-1',
                    )}
                  >
                    {item.title}
                  </span>
                  <ArrowRight
                    aria-hidden="true"
                    className={cn(
                      'h-4 w-4 flex-none self-center transition-all duration-180',
                      selected ? 'translate-x-0 text-[#8a5f1c] opacity-100' : '-translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-60',
                    )}
                  />
                </button>
              );
            })}
          </div>
          <div className="lg:col-span-7">
            <div role="tabpanel" className={cn('flex min-h-full flex-col rounded-lg p-7 sm:p-10 lg:sticky lg:top-28', GLASS_ELEVATED)}>
              <div className="flex items-start justify-between gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded bg-[#1a2430] text-[#e8c87e]">
                  {current.icon}
                </span>
                <span aria-hidden="true" className="font-serif text-5xl tracking-tight text-[#cfc9b8] tabular-nums">
                  {String(active + 1).padStart(2, '0')}
                </span>
              </div>
              <h3 className="m-0 mt-6 font-serif text-2xl leading-tight font-medium tracking-tight text-[#1a2430] sm:text-3xl">
                {current.title}
              </h3>
              <p className="m-0 mt-3 max-w-xl leading-relaxed text-[#4c5b6b]">{current.description}</p>
              {current.points && current.points.length > 0 ? (
                <ul className="m-0 mt-6 grid list-none gap-2.5 border-t border-[#1a2430]/10 p-0 pt-6">
                  {current.points.map((point) => (
                    <li key={point} className="flex items-start gap-2.5 text-sm leading-relaxed text-[#1a2430]">
                      <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-[#e3f2e9]">
                        <Check className="h-3 w-3 text-[#0e6b4f]" aria-hidden="true" />
                      </span>
                      {point}
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="mt-auto flex items-center justify-between gap-3 pt-8">
                <button
                  type="button"
                  onClick={() => setActive((active - 1 + capabilities.length) % capabilities.length)}
                  className="inline-flex items-center gap-2 rounded border border-[#cfc9b8] bg-white/60 px-4 py-2 text-[13px] font-semibold transition-all duration-180 hover:-translate-y-px hover:border-[#1a2430]/40 hover:bg-white active:translate-y-0"
                >
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  Sebelumnya
                </button>
                <button
                  type="button"
                  onClick={() => setActive((active + 1) % capabilities.length)}
                  className="inline-flex items-center gap-2 rounded bg-[#1a2430] px-4 py-2 text-[13px] font-semibold text-white transition-all duration-180 hover:-translate-y-px hover:bg-[#2b3a4b] active:translate-y-0"
                >
                  Berikutnya
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
