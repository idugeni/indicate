'use client';

import { useState } from 'react';

import type { MasterTemplatePreset } from '@/ui/themes';
import { GLASS_STANDARD } from '@/modules/site/components/landing/material';
import { cn } from '@/ui/cn';

function categoryLabel(category: MasterTemplatePreset['category']) {
  if (category === 'editorial') return 'Editorial';
  if (category === 'tech') return 'Teknologi';
  if (category === 'official') return 'Institusi';
  if (category === 'visual') return 'Visual';
  if (category === 'live') return 'Liputan live';
  return 'Kabar harian';
}

interface TemplateSpec {
  readonly primary: string;
  readonly scheme: 'light' | 'dark';
  readonly navbar: string;
  readonly hero: string;
  readonly article: string;
  readonly related: string;
  readonly footer: string;
  readonly drawer: string;
}

const SPECS: Readonly<Record<string, TemplateSpec>> = {
  'clean-blue': { primary: '#1a5fd0', scheme: 'light', navbar: 'Slim', hero: 'Split', article: 'Stacked', related: 'Grid', footer: 'Klasik', drawer: 'Kanan' },
  'black-lime': { primary: '#c5f82a', scheme: 'dark', navbar: 'Masthead', hero: 'Mosaik', article: 'Split', related: 'Overlay', footer: 'Wordmark', drawer: 'Layar penuh' },
  'dark-navy': { primary: '#2f7bff', scheme: 'dark', navbar: 'Floating', hero: 'Carousel', article: 'Split', related: 'Overlay', footer: 'Wordmark', drawer: 'Layar penuh' },
  'glassy-blue': { primary: '#1f7cff', scheme: 'light', navbar: 'Double', hero: 'Overlay', article: 'Breakout', related: 'Carousel', footer: 'Minimal', drawer: 'Sheet bawah' },
  'green-minimal': { primary: '#1d7a38', scheme: 'light', navbar: 'Underline', hero: 'Overlay', article: 'Text-first', related: 'Minimal', footer: 'Minimal', drawer: 'Sheet bawah' },
  'orange-modern': { primary: '#ea580c', scheme: 'light', navbar: 'Double', hero: 'Overlay', article: 'Breakout', related: 'Carousel', footer: 'Mega', drawer: 'Kiri' },
  'purple-editorial': { primary: '#7c3aed', scheme: 'light', navbar: 'Centered', hero: 'Mosaik', article: 'Viewport', related: 'Split', footer: 'Premium', drawer: 'Grid' },
  'red-editorial': { primary: '#b91c1c', scheme: 'light', navbar: 'Masthead', hero: 'Carousel', article: 'Overlay', related: 'Numbered', footer: 'Newsletter', drawer: 'Kiri' },
  'soft-blue': { primary: '#2563eb', scheme: 'light', navbar: 'Slim', hero: 'Split', article: 'Stacked', related: 'Grid', footer: 'Minimal', drawer: 'Kanan' },
  'warm-editorial': { primary: '#b4532a', scheme: 'light', navbar: 'Centered', hero: 'Serif', article: 'Overlay', related: 'Numbered', footer: 'Newsletter', drawer: 'Grid' },
};

/**
 * Switcher showcase template: daftar bernomor + panel pratinjau per template.
 *
 * @param templates - Preset template master dari registry.
 * @returns Daftar tombol dan panel spesifikasi template aktif.
 */
export function TemplateSwitcher({ templates }: { readonly templates: readonly MasterTemplatePreset[] }) {
  const [activeId, setActiveId] = useState(() => templates[0]?.id ?? '');
  const active = templates.find((preset) => preset.id === activeId) ?? templates[0];
  if (!active) return null;
  const spec = SPECS[active.id];
  const rows: ReadonlyArray<readonly [string, string]> = spec
    ? [
        ['Navbar', spec.navbar],
        ['Hero beranda', spec.hero],
        ['Hero artikel', spec.article],
        ['Artikel terkait', spec.related],
        ['Footer', spec.footer],
        ['Menu seluler', spec.drawer],
      ]
    : [];
  return (
    <div className="mt-10 grid items-start gap-10 lg:grid-cols-12">
      <ol className="m-0 grid list-none content-start gap-0 border-t border-[#1a2430]/15 p-0 lg:col-span-4 lg:sticky lg:top-28">
        {templates.map((preset, index) => {
          const selected = preset.id === active.id;
          return (
            <li key={preset.id} className="m-0 border-b border-[#1a2430]/15 p-0">
              <button
                type="button"
                onClick={() => setActiveId(preset.id)}
                aria-current={selected ? 'true' : undefined}
                className="group flex w-full cursor-pointer items-baseline gap-4 bg-transparent py-4 text-left"
              >
                <span aria-hidden="true" className="font-mono text-[11px] text-[#b88d3a] tabular-nums">
                  T.{String(index + 1).padStart(2, '0')}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={`block truncate text-sm font-semibold tracking-tight ${selected ? 'underline decoration-[#b88d3a] decoration-2 underline-offset-4' : 'group-hover:underline group-hover:decoration-[#b88d3a] group-hover:decoration-2 group-hover:underline-offset-4'}`}
                  >
                    {preset.name}
                  </span>
                  <span className="mt-0.5 line-clamp-2 block text-[13px] leading-snug text-[#4c5b6b]">
                    {preset.description}
                  </span>
                </span>
                <span className="hidden flex-none font-mono text-[10px] tracking-wide text-[#5f6b7a] uppercase sm:block">
                  {categoryLabel(preset.category)}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <div className="lg:col-span-8">
        <figure
          aria-label={`Pratinjau ${active.name}`}
          aria-live="polite"
          className={cn('m-0 overflow-hidden rounded-lg', GLASS_STANDARD)}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1a2430]/10 px-5 py-3.5 sm:px-7">
            <p className="m-0 flex items-center gap-2.5 font-mono text-[11px] text-[#5f6b7a]">
              <span aria-hidden="true" className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#d8d3c4]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#d8d3c4]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#b88d3a]" />
              </span>
              pratinjau · {active.id}
            </p>
            <p className="m-0 flex items-center gap-2 font-mono text-[11px] text-[#4c5b6b]">
              {spec ? (
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: spec.primary }}
                />
              ) : null}
              {active.name} · {spec ? (spec.scheme === 'dark' ? 'Gelap' : 'Terang') : categoryLabel(active.category)}
            </p>
          </div>
          <div className="grid sm:grid-cols-12">
            <div className="border-b border-[#1a2430]/10 p-6 sm:col-span-7 sm:border-r sm:border-b-0 sm:p-9">
              <p className="m-0 font-mono text-[10px] tracking-[0.16em] text-[#8a5f1c] uppercase">
                Terkini · {categoryLabel(active.category)}
              </p>
              <p className="m-0 mt-3 max-w-md font-serif text-[1.7rem] leading-[1.12] font-medium tracking-tight sm:text-4xl">
                {active.name}
              </p>
              <p className="m-0 mt-4 max-w-md text-sm leading-relaxed text-[#4c5b6b]">{active.description}</p>
              <p className="m-0 mt-6 border-t border-[#1a2430]/10 pt-4 font-mono text-[11px] text-[#5f6b7a]">
                Atribusi kanonik · pratinjau tautan · sitemap per situs
              </p>
            </div>
            <div className="bg-white/50 p-6 sm:col-span-5 sm:p-9">
              <p className="m-0 font-mono text-[10px] tracking-[0.16em] text-[#5f6b7a] uppercase">
                Varian per area
              </p>
              <ul className="m-0 mt-4 grid list-none gap-3 p-0 text-sm">
                {rows.map(([area, value]) => (
                  <li key={area} className="flex items-baseline justify-between gap-3 leading-snug">
                    <span className="text-[#4c5b6b]">{area}</span>
                    <span className="flex-none font-semibold tracking-tight">{value}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </figure>
      </div>
    </div>
  );
}
