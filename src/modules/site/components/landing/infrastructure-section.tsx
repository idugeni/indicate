import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { SHOWCASE_BRANDS, SHOWCASE_REGIONAL_EDITIONS } from '@/ui/site/showcase-brands';
import { Eyebrow, GLASS_ELEVATED } from '@/modules/site/components/landing/material';
import { cn } from '@/ui/cn';

const SPEC_ROWS = Object.freeze([
  { term: 'Sumber kebenaran', value: 'PostgreSQL 17 — satu basis data untuk redaksi, penerbitan, dan audit.' },
  { term: 'Isolasi data', value: 'Strict RLS per organisasi — tanpa kecocokan sebagian, tanpa situs cadangan.' },
  { term: 'Penayangan', value: 'Cloudflare Edge dengan TLS penuh — host eksak menentukan situs publik.' },
  { term: 'Media', value: 'Penyimpanan privat dengan otorisasi bertanda tangan berumur pendek.' },
  { term: 'Akuntabilitas', value: 'Jejak audit hanya-tambah untuk setiap perubahan sensitif.' },
  { term: 'Performa', value: 'Namespace cache dan SEO diturunkan dari konteks host yang sama.' },
]);

const EXAMPLE_BRAND = SHOWCASE_BRANDS[0];

export function InfrastructureSection() {
  return (
    <section aria-labelledby="infrastruktur-heading" className="relative overflow-hidden border-y border-[#e2ded2] bg-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(26,36,48,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(26,36,48,0.035)_1px,transparent_1px)] bg-[size:2.75rem_2.75rem] [mask-image:radial-gradient(60rem_34rem_at_80%_10%,black,transparent_75%)]"
      />
      <div className="relative mx-auto w-full max-w-7xl px-5 py-16 sm:px-8 md:py-24">
        <div className="max-w-3xl">
          <Eyebrow index="02">Infrastruktur, bukan sekadar CMS</Eyebrow>
          <h2
            id="infrastruktur-heading"
            className="m-0 mt-4 font-serif text-3xl leading-[1.05] font-medium tracking-tight text-balance sm:text-[2.75rem]"
          >
            Arsitektur yang <em className="text-[#8a5f1c]">bisa diaudit</em>, bukan janji yang harus dipercaya.
          </h2>
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-12">
          <dl className="m-0 grid content-start gap-0 border-t border-[#1a2430]/15 lg:col-span-5">
            {SPEC_ROWS.map((row, index) => (
              <div key={row.term} className="grid grid-cols-[auto_minmax(0,1fr)] gap-4 border-b border-[#1a2430]/15 py-4">
                <dt className="m-0 font-mono text-[11px] text-[#b88d3a] tabular-nums">
                  S.{String(index + 1).padStart(2, '0')}
                </dt>
                <div>
                  <dt className="m-0 font-mono text-[11px] font-medium tracking-[0.12em] text-[#1a2430] uppercase">
                    {row.term}
                  </dt>
                  <dd className="m-0 mt-1 text-sm leading-relaxed text-[#4c5b6b]">{row.value}</dd>
                </div>
              </div>
            ))}
          </dl>

          <div className={cn('flex flex-col rounded-lg p-6 sm:p-8 lg:col-span-7', GLASS_ELEVATED)}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="m-0 font-mono text-[11px] tracking-[0.14em] text-[#5f6b7a] uppercase">
                Peta sistem — organisasi ke brand
              </p>
              <p className="m-0 font-mono text-[11px] text-[#0e6b4f]">isolasi per brand · tanpa campur</p>
            </div>
            <div className="mt-6 rounded border border-[#1a2430]/15 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1a2430]/10 pb-4">
                <p className="m-0 font-serif text-xl tracking-tight text-[#1a2430]">Portofolio brand penerbit</p>
                <Badge variant="secondary" className="rounded font-mono text-[10px] tracking-[0.1em] uppercase">
                  Showcase
                </Badge>
              </div>
              <div className="grid gap-0 sm:grid-cols-2">
                <div className="border-b border-[#1a2430]/10 py-4 sm:border-r sm:border-b-0 sm:pr-5 sm:py-5">
                  <p className="m-0 font-mono text-[10px] tracking-[0.14em] text-[#5f6b7a] uppercase">Brand sorotan</p>
                  <p className="m-0 mt-2 flex items-center gap-3">
                    <Avatar size="lg" className="flex-none rounded-md after:rounded-md">
                      <AvatarFallback
                        style={{ backgroundColor: EXAMPLE_BRAND.accent, color: '#f4f2ec' }}
                        className="rounded-md bg-transparent font-serif text-sm font-semibold"
                      >
                        {EXAMPLE_BRAND.initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate text-sm font-semibold text-[#1a2430]">{EXAMPLE_BRAND.name}</span>
                  </p>
                  <p className="m-0 mt-2.5 flex flex-wrap gap-1.5">
                    <Badge className="rounded border-[#1a2430] bg-[#1a2430] font-mono text-[10px] text-white">
                      {EXAMPLE_BRAND.category}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="rounded border-[#cfc9b8] font-mono text-[10px] text-[#4c5b6b]"
                    >
                      SEO
                    </Badge>
                    <Badge
                      variant="outline"
                      className="rounded border-[#cfc9b8] font-mono text-[10px] text-[#4c5b6b]"
                    >
                      RSS
                    </Badge>
                  </p>
                </div>
                <div className="py-4 sm:py-5 sm:pl-5">
                  <p className="m-0 font-mono text-[10px] tracking-[0.14em] text-[#5f6b7a] uppercase">
                    Edisi daerah
                  </p>
                  <ul className="m-0 mt-1.5 grid list-none gap-1 p-0 font-mono text-[11px] text-[#4c5b6b]">
                    {SHOWCASE_REGIONAL_EDITIONS.slice(0, 3).map((edition) => (
                      <li key={edition} className="truncate">
                        {edition}
                      </li>
                    ))}
                  </ul>
                  <p className="m-0 mt-2.5">
                    <Badge
                      variant="outline"
                      className="rounded border-dashed border-[#b3aca0] font-mono text-[10px] text-[#5f6b7a]"
                    >
                      + edisi lain
                    </Badge>
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <p className="m-0 rounded border border-[#1a2430]/10 bg-white/70 px-4 py-3 text-[13px] text-[#4c5b6b]">
                <span className="font-semibold text-[#1a2430]">Brand asing → ditolak.</span> Tidak ada yang bisa membaca
                lintas organisasi lewat brand lain.
              </p>
              <p className="m-0 rounded border border-[#1a2430]/10 bg-white/70 px-4 py-3 text-[13px] text-[#4c5b6b]">
                <span className="font-semibold text-[#1a2430]">Cache per brand.</span> Invalidation satu situs tidak
                menyentuh situs lain.
              </p>
            </div>
            <ol className="m-0 mt-4 grid list-none gap-px overflow-hidden rounded border border-[#1a2430]/10 bg-[#1a2430]/10 p-0 sm:grid-cols-4">
              {['Brand masuk', 'Cocokkan eksak', 'Muat situs', 'Sajikan'].map((step, index) => (
                <li key={step} className="flex items-center gap-2.5 bg-white/80 px-3.5 py-2.5">
                  <span aria-hidden="true" className="font-mono text-[10px] text-[#b88d3a] tabular-nums">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="text-[12px] font-medium">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
