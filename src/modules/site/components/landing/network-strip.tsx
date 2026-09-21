import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { SHOWCASE_BRANDS } from '@/ui/site/showcase-brands';
import { PROOF_POINTS } from '@/ui/site/marketing-content';
import { cn } from '@/ui/cn';

const SPEC_ITEMS = Object.freeze([
  'Aktif 1×24 jam',
  'Satu dasbor',
  'Multi-portal',
  'Isolasi data',
  'Tanpa paket',
  'Didampingi manusia',
]);

/**
 * Render the network brand logo wall in shadcn elements.
 *
 * @returns Network strip containing a professional brand logo board.
 */
export function NetworkStrip() {
  return (
    <section aria-label="Fondasi jaringan" className="border-y border-[#e2ded2] bg-white">
      <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
        <ul className="m-0 flex list-none flex-wrap items-center justify-center gap-x-6 gap-y-2 p-0 py-3.5 text-center font-mono text-[11px] tracking-[0.12em] text-[#4c5b6b] uppercase">
          {SPEC_ITEMS.map((item, index) => (
            <li key={item} className="flex flex-none items-center gap-6">
              {index > 0 ? (
                <span aria-hidden="true" className="text-[#cfc9b8]">
                  /
                </span>
              ) : null}
              {item}
            </li>
          ))}
        </ul>
      </div>
      <div className="border-t border-[#e7e3d6]">
        <div className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-8 md:py-24">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <p className="m-0 flex-none font-mono text-[11px] tracking-[0.14em] text-[#5f6b7a] uppercase">
              Jaringan brand
            </p>
            <span aria-hidden="true" className="h-px flex-1 bg-[#e7e3d6]" />
            <Badge variant="secondary" className="rounded font-mono text-[10px] tracking-[0.12em] uppercase">
              Jaringan terkelola
            </Badge>
          </div>
          <p className="m-0 mt-7 max-w-2xl font-serif text-[1.7rem] leading-tight tracking-tight sm:text-4xl">
            Satu dasbor untuk banyak wajah penerbit.
          </p>
          <Card className="mt-8 gap-0 overflow-hidden rounded-lg bg-[#e7e3d6] p-0 text-[#1a2430] ring-[#e7e3d6]">
            <ul className="m-0 grid list-none gap-px p-0 sm:grid-cols-2 lg:grid-cols-5">
              {SHOWCASE_BRANDS.map((brand) => (
                <li
                  key={brand.name}
                  className="group flex min-h-44 flex-col items-center justify-center gap-3 bg-[#faf9f5] px-5 py-8 text-center transition-colors duration-180 hover:bg-white"
                >
                  <span
                    aria-label={brand.name}
                    role="img"
                    className={cn(
                      'block text-[1.4rem] leading-none whitespace-nowrap transition-transform duration-180 group-hover:-translate-y-0.5 xl:text-[1.55rem]',
                      brand.wordmarkClass,
                    )}
                  >
                    <span className="text-[#1a2430]">{brand.head}</span>
                    <span style={{ color: brand.accent }}>{brand.tail}</span>
                  </span>
                  <span className="flex items-center gap-2.5 font-mono text-[10px] tracking-[0.22em] text-[#5f6b7a] uppercase">
                    <span aria-hidden="true" className="h-px w-6 bg-[#cfc9b8]" />
                    {brand.category}
                    <span aria-hidden="true" className="h-px w-6 bg-[#cfc9b8]" />
                  </span>
                </li>
              ))}
              <li className="flex min-h-44 bg-[#1a2430]">
                <Link
                  href="/contact"
                  aria-label="Daftarkan brand Anda — hubungi kami"
                  className="group flex flex-1 flex-col items-center justify-center gap-3 px-5 py-8 text-center transition-colors duration-180 outline-offset-[-2px] hover:bg-[#2b3a4b] focus-visible:outline-2 focus-visible:outline-[#e8c87e]"
                >
                  <span className="block font-serif text-[1.4rem] leading-none font-black tracking-tight whitespace-nowrap transition-transform duration-180 group-hover:-translate-y-0.5 xl:text-[1.55rem]">
                    <span className="text-[#f4f2ec]">Brand Anda</span>
                    <span className="text-[#e8c87e]"> +</span>
                  </span>
                  <span className="flex items-center gap-2.5 font-mono text-[10px] tracking-[0.22em] text-[#e8c87e] uppercase">
                    <span aria-hidden="true" className="h-px w-6 bg-[#e8c87e]/50" />
                    Gabung jaringan
                    <span aria-hidden="true" className="h-px w-6 bg-[#e8c87e]/50" />
                  </span>
                </Link>
              </li>
            </ul>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-[#1a2430]/10 bg-[#faf9f5] px-5 py-3 font-mono text-[11px] text-[#5f6b7a]">
              <span>Identitas tiap brand</span>
              <span aria-hidden="true">·</span>
              <span>SEO</span>
              <span aria-hidden="true">·</span>
              <span>RSS</span>
              <span aria-hidden="true">·</span>
              <span>sitemap per brand</span>
            </div>
          </Card>
          <dl className="m-0 mt-14 grid gap-8 p-0 sm:grid-cols-3">
            {PROOF_POINTS.map((point, index) => (
              <div
                key={point.term}
                className="group border-t-2 border-[#1a2430]/10 pt-5 transition-colors duration-180 hover:border-[#b88d3a]"
              >
                <dt className="m-0">
                  <span aria-hidden="true" className="block font-serif text-5xl tracking-tight text-[#1a2430] tabular-nums transition-colors duration-180 group-hover:text-[#8a5f1c]">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="mt-3 block text-[15px] font-semibold tracking-tight">
                    {point.term}
                  </span>
                </dt>
                <dd className="m-0 mt-1.5 text-sm leading-relaxed text-[#4c5b6b]">{point.detail}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
