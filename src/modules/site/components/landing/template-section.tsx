import type { MasterTemplatePreset } from '@/ui/themes';
import { Eyebrow, GLASS_STANDARD, SectionShell } from '@/modules/site/components/landing/material';
import { cn } from '@/ui/cn';

function categoryLabel(category: MasterTemplatePreset['category']) {
  if (category === 'editorial') return 'Editorial';
  if (category === 'tech') return 'Teknologi';
  if (category === 'official') return 'Institusi';
  if (category === 'visual') return 'Visual';
  if (category === 'live') return 'Liputan live';
  return 'Kabar harian';
}

export function TemplateSection({ templates }: { readonly templates: readonly MasterTemplatePreset[] }) {
  const featured = templates[0];
  if (!featured) return null;
  return (
    <SectionShell labelledBy="tampilan-heading" className="py-16 md:py-24">
      <div>
        <Eyebrow index="04">Tampilan situs</Eyebrow>
        <h2
          id="tampilan-heading"
          className="m-0 mt-4 max-w-[20ch] font-serif text-3xl leading-[1.05] font-medium tracking-tight text-balance sm:text-[2.75rem]"
        >
          Wajah sendiri-sendiri, <em className="text-[#8a5f1c]">mesin</em> yang sama.
        </h2>
      </div>
      <div className="mt-10 grid items-start gap-10 lg:grid-cols-12">
        <ol className="m-0 grid list-none content-start gap-0 border-t border-[#1a2430]/15 p-0 lg:col-span-4 lg:sticky lg:top-28">
          {templates.map((preset, index) => (
            <li
              key={preset.id}
              className="group flex items-baseline gap-4 border-b border-[#1a2430]/15 py-4"
            >
              <span aria-hidden="true" className="font-mono text-[11px] text-[#b88d3a] tabular-nums">
                T.{String(index + 1).padStart(2, '0')}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold tracking-tight group-hover:underline group-hover:decoration-[#b88d3a] group-hover:decoration-2 group-hover:underline-offset-4">
                  {preset.name}
                </span>
                <span className="mt-0.5 line-clamp-2 block text-[13px] leading-snug text-[#4c5b6b]">
                  {preset.description}
                </span>
              </span>
              <span className="hidden flex-none font-mono text-[10px] tracking-wide text-[#5f6b7a] uppercase transition-colors duration-180 group-hover:text-[#8a5f1c] sm:block">
                {categoryLabel(preset.category)}
              </span>
            </li>
          ))}
        </ol>
        <div className="lg:col-span-8">
          <figure
            aria-label="Pola tampilan situs yang dipakai seluruh jaringan"
            className={cn('m-0 overflow-hidden rounded-lg', GLASS_STANDARD)}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1a2430]/10 px-5 py-3.5 sm:px-7">
              <p className="m-0 flex items-center gap-2.5 font-mono text-[11px] text-[#5f6b7a]">
                <span aria-hidden="true" className="flex gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#d8d3c4]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#d8d3c4]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#b88d3a]" />
                </span>
                arunapos.id
              </p>
              <p className="m-0 font-mono text-[11px] text-[#4c5b6b]">{featured.name}</p>
            </div>
            <div className="grid sm:grid-cols-12">
              <div className="border-b border-[#1a2430]/10 p-6 sm:col-span-7 sm:border-r sm:border-b-0 sm:p-9">
                <p className="m-0 font-mono text-[10px] tracking-[0.16em] text-[#8a5f1c] uppercase">
                  Terkini · {categoryLabel(featured.category)}
                </p>
                <p className="m-0 mt-3 max-w-md font-serif text-[1.7rem] leading-[1.12] font-medium tracking-tight sm:text-4xl">
                  Redaksi menulis sekali, jaringan tayang serentak
                </p>
                <p className="m-0 mt-4 max-w-md text-sm leading-relaxed text-[#4c5b6b]">{featured.description}</p>
                <p className="m-0 mt-6 border-t border-[#1a2430]/10 pt-4 font-mono text-[11px] text-[#5f6b7a]">
                  Atribusi kanonik · pratinjau tautan · sitemap per situs
                </p>
              </div>
              <div className="bg-white/50 p-6 sm:col-span-5 sm:p-9">
                <p className="m-0 font-mono text-[10px] tracking-[0.16em] text-[#5f6b7a] uppercase">
                  Kustom per situs
                </p>
                <ul className="m-0 mt-4 grid list-none gap-3.5 p-0 text-sm">
                  {['Warna, logo, dan susunan sendiri', 'Subdomain wilayah per domain induk', 'Dinilai mandiri oleh mesin pencari'].map(
                    (line) => (
                      <li key={line} className="flex gap-2.5 leading-snug">
                        <span aria-hidden="true" className="mt-[7px] h-1.5 w-1.5 flex-none rounded-full bg-[#b88d3a]" />
                        {line}
                      </li>
                    ),
                  )}
                </ul>
              </div>
            </div>
          </figure>
        </div>
      </div>
    </SectionShell>
  );
}
