import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { USE_CASES, VALUE_PROPOSITIONS } from '@/ui/site/marketing-content';
import { Eyebrow, SectionShell } from '@/modules/site/components/landing/material';

export function PlatformSection() {
  return (
    <SectionShell labelledBy="platform-heading" className="py-16 md:py-24">
      <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-28">
            <Eyebrow index="01">Cara kerja platform</Eyebrow>
            <h2
              id="platform-heading"
              className="m-0 mt-4 font-serif text-3xl leading-[1.05] font-medium tracking-tight text-balance sm:text-[2.75rem]"
            >
              Satu tulisan.
              <br />
              <em className="text-[#8a5f1c]">Banyak</em> tayangan.
            </h2>
            <p className="m-0 mt-5 max-w-md leading-relaxed text-[#4c5b6b]">
              Naskah kanonik ditulis satu kali dan disimpan satu kali. Penugasan ke tiap situs berjalan sebagai
              pekerjaan latar yang terpantau — antre, terkirim, atau dicoba ulang otomatis.
            </p>
            <Link
              href="/services"
              className="group mt-7 inline-flex items-center gap-2 text-sm font-semibold underline decoration-[#b88d3a] decoration-2 underline-offset-8 transition-colors hover:text-[#8a5f1c]"
            >
              Pelajari layanan sindikasi
              <ArrowRight className="h-4 w-4 transition-transform duration-180 group-hover:translate-x-1" aria-hidden="true" />
            </Link>
          </div>
        </div>
        <ol className="m-0 grid list-none gap-0 border-t border-[#1a2430]/15 p-0 lg:col-span-8">
          {VALUE_PROPOSITIONS.map((item, index) => (
            <li
              key={item.title}
              className="group grid gap-1.5 border-b border-[#1a2430]/15 py-6 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-6 lg:py-7"
            >
              <span aria-hidden="true" className="flex items-center gap-2 tabular-nums sm:pt-1.5">
                <span className="h-px w-5 origin-left scale-x-0 bg-[#b88d3a] transition-transform duration-180 group-hover:scale-x-100" />
                <span className="font-mono text-[11px] text-[#b88d3a]">
                  {String(index + 1).padStart(2, '0')}
                </span>
              </span>
              <span>
                <span className="block font-serif text-[1.4rem] leading-tight font-medium tracking-tight">
                  {item.title}
                </span>
                <span className="mt-1.5 block max-w-2xl text-sm leading-relaxed text-[#4c5b6b]">
                  {item.description}
                </span>
              </span>
              <ArrowRight
                aria-hidden="true"
                className="hidden h-5 w-5 -translate-x-2 self-center text-[#b88d3a] opacity-0 transition-all duration-180 group-hover:translate-x-0 group-hover:opacity-100 sm:block"
              />
            </li>
          ))}
        </ol>
      </div>
      <div className="mt-16 border-t border-[#1a2430]/10 pt-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2 py-5">
          <p className="m-0 font-mono text-[11px] tracking-[0.14em] text-[#5f6b7a] uppercase">
            Dirancang untuk setiap skala redaksi
          </p>
          <p className="m-0 font-mono text-[11px] text-[#b88d3a] tabular-nums">Semua skala</p>
        </div>
        <div className="grid gap-x-12 sm:grid-cols-2">
          {USE_CASES.map((item, index) => (
            <div
              key={item.title}
              className="group grid grid-cols-[auto_minmax(0,1fr)] gap-5 border-t border-[#1a2430]/15 py-7"
            >
              <span
                aria-hidden="true"
                className="flex h-12 w-12 items-center justify-center rounded bg-[#1a2430]/5 font-serif text-xl tracking-tight text-[#8a5f1c] tabular-nums transition-colors duration-180 group-hover:bg-[#1a2430] group-hover:text-[#e8c87e]"
              >
                {String(index + 1).padStart(2, '0')}
              </span>
              <span>
                <h3 className="m-0 font-serif text-[1.35rem] leading-tight font-medium tracking-tight">
                  {item.title}
                </h3>
                <p className="m-0 mt-2 max-w-md text-sm leading-relaxed text-[#4c5b6b]">{item.description}</p>
              </span>
            </div>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}
