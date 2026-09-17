import { SHOWCASE_BRANDS } from '@/ui/site/showcase-brands';
import { Eyebrow } from '@/modules/site/components/landing/material';

const SPEC_ROWS = Object.freeze([
  { term: 'Sumber kebenaran', value: 'PostgreSQL 17 — satu basis data untuk redaksi, penerbitan, dan audit.' },
  { term: 'Isolasi data', value: 'Strict RLS per organisasi — tanpa kecocokan sebagian, tanpa situs cadangan.' },
  { term: 'Penayangan', value: 'Cloudflare Edge dengan TLS penuh — host eksak menentukan situs publik.' },
  { term: 'Media', value: 'Penyimpanan privat dengan otorisasi bertanda tangan berumur pendek.' },
  { term: 'Akuntabilitas', value: 'Jejak audit hanya-tambah untuk setiap perubahan sensitif.' },
  { term: 'Performa', value: 'Namespace cache dan SEO diturunkan dari konteks host yang sama.' },
]);

const EXAMPLE_BRAND = SHOWCASE_BRANDS[0];

const TRACE_ROWS = Object.freeze([
  { stage: 'Host masuk', detail: 'exact match', status: 'OK', tone: 'ok' },
  { stage: 'Cocokkan eksak', detail: 'tanpa fallback', status: 'EXACT', tone: 'brass' },
  { stage: 'Muat situs', detail: 'RLS per organisasi', status: 'ENFORCED', tone: 'ok' },
  { stage: 'Sajikan', detail: 'edge · media bertanda', status: '200', tone: 'ok' },
] as const);

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

          <div className="lg:col-span-7">
            <div className="rounded-lg border border-[#1a2430]/10 bg-white shadow-[0_24px_48px_-28px_rgba(26,36,48,0.3)]">
              <div className="flex flex-wrap items-center gap-2.5 border-b border-[#1a2430]/10 px-5 py-4 sm:px-6">
                <p className="m-0 font-mono text-[11px] tracking-[0.14em] text-[#5f6b7a] uppercase">
                  Jalur request — {EXAMPLE_BRAND.name}
                </p>
                <p className="m-0 ml-auto flex items-center gap-1.5 rounded-full bg-[#e3f2e9] px-2.5 py-1 font-mono text-[10px] font-medium text-[#0e6b4f]">
                  <span aria-hidden="true" className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#149a6d] opacity-60" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#0e6b4f]" />
                  </span>
                  operational
                </p>
              </div>
              <ol className="relative m-0 grid list-none p-0">
                <span aria-hidden="true" className="absolute top-7 bottom-7 left-[27px] w-px bg-[#e7e3d6] sm:left-[31px]" />
                {TRACE_ROWS.map((row, index) => (
                  <li
                    key={row.stage}
                    className="group relative flex items-start gap-4 px-5 py-5 sm:px-6"
                  >
                    <span
                      aria-hidden="true"
                      className="relative z-10 mt-0.5 flex h-3.5 w-3.5 flex-none items-center justify-center rounded-full border-2 border-[#b88d3a] bg-white transition-colors duration-180 group-hover:bg-[#b88d3a]"
                    >
                      <span className="sr-only">{String(index + 1).padStart(2, '0')}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-semibold tracking-tight text-[#1a2430]">
                        {row.stage}
                      </span>
                      <span className="mt-0.5 block font-mono text-[11px] text-[#5f6b7a]">
                        {row.detail}
                      </span>
                    </span>
                    <span
                      className={
                        row.tone === 'ok'
                          ? 'flex-none rounded bg-[#e3f2e9] px-2 py-0.5 font-mono text-[10px] font-medium text-[#0e6b4f]'
                          : 'flex-none rounded bg-[#f5ead3] px-2 py-0.5 font-mono text-[10px] font-medium text-[#8a5f1c]'
                      }
                    >
                      {row.status}
                    </span>
                  </li>
                ))}
              </ol>
              <p className="m-0 border-t border-[#1a2430]/10 px-5 py-3.5 font-mono text-[11px] text-[#5f6b7a] sm:px-6">
                audit append-only · +1 record · brand asing ditolak · cache per brand
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
