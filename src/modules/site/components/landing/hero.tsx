import Link from 'next/link';
import { ArrowRight, Check, FileCheck2, Image, ShieldCheck } from 'lucide-react';
import { SERVICE_SUMMARY } from '@/ui/site/marketing-content';
import { SHOWCASE_BRANDS } from '@/ui/site/showcase-brands';
import {
  Eyebrow,
  GLASS_ELEVATED,
  GLASS_HIGHLIGHTED,
} from '@/modules/site/components/landing/material';
import { cn } from '@/ui/cn';

const QUEUE_ROWS = Object.freeze([
  { brand: SHOWCASE_BRANDS[0], edition: 'Portal utama', detail: '10:42:07', status: 'Terkirim', tone: 'done' },
  { brand: SHOWCASE_BRANDS[1], edition: 'Portal utama', detail: '10:42:11', status: 'Terkirim', tone: 'done' },
  { brand: SHOWCASE_BRANDS[2], edition: 'Edisi Bandung', detail: 'dalam antrean', status: 'Mengirim', tone: 'sending' },
  { brand: SHOWCASE_BRANDS[3], edition: 'Edisi Surabaya', detail: 'dalam antrean', status: 'Antre', tone: 'queued' },
] as const);

const NETWORK_NODES = Object.freeze([
  { brand: SHOWCASE_BRANDS[0], edition: 'Portal utama' },
  { brand: SHOWCASE_BRANDS[1], edition: 'Portal utama' },
  { brand: SHOWCASE_BRANDS[2], edition: 'Edisi Bandung' },
  { brand: SHOWCASE_BRANDS[3], edition: 'Edisi Surabaya' },
]);

const FLOW_STEPS = Object.freeze(['Tulis', 'Tugaskan', 'Terbitkan']);

export function Hero() {
  return (
    <section aria-labelledby="hero-heading" className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(56rem_32rem_at_50%_-10rem,rgba(184,141,58,0.13),transparent_65%),linear-gradient(rgba(26,36,48,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(26,36,48,0.05)_1px,transparent_1px)] bg-[size:auto,3.5rem_3.5rem,3.5rem_3.5rem] [mask-image:linear-gradient(to_bottom,black_60%,transparent_99%)]"
      />
      <div className="relative mx-auto w-full max-w-7xl px-5 pt-12 pb-14 sm:px-8 md:pt-16 md:pb-20">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <Eyebrow>Indicate 2.0 — Infrastruktur penerbitan multi-situs</Eyebrow>
            <h1
              id="hero-heading"
              className="m-0 mt-5 font-serif text-[clamp(2.9rem,7.2vw,5.6rem)] leading-[0.98] font-medium tracking-tight text-balance"
            >
              Tulis satu naskah.
              <br />
              Terbitkan ke <em className="text-[#8a5f1c]">seluruh jaringan</em>.
            </h1>
          </div>
          <div className="lg:col-span-4">
            <p className="m-0 max-w-md leading-relaxed text-[#4c5b6b] lg:border-l lg:border-[#b88d3a]/50 lg:pl-6">
              {SERVICE_SUMMARY}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/contact"
                className="group inline-flex items-center gap-2 rounded bg-[#1a2430] px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_36px_-16px_rgba(26,36,48,0.55)] transition-all duration-180 hover:-translate-y-0.5 hover:bg-[#2b3a4b] active:translate-y-0 active:bg-[#141d27]"
              >
                Jadwalkan diskusi arsitektur
                <ArrowRight className="h-4 w-4 transition-transform duration-180 group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
              <Link
                href="/services"
                className="inline-flex items-center gap-2 rounded border border-[#cfc9b8] bg-white/60 px-6 py-3 text-sm font-semibold backdrop-blur transition-all duration-180 hover:-translate-y-0.5 hover:border-[#1a2430]/40 hover:bg-white active:translate-y-0"
              >
                Lihat layanan
              </Link>
            </div>
          </div>
        </div>

        <figure aria-label="Ruang redaksi: naskah, antrean distribusi, dan jaringan penerbit" className="m-0 mt-12 md:mt-16">
          <div className={cn('overflow-hidden rounded-xl', GLASS_ELEVATED)}>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[#1a2430]/10 bg-white/60 px-5 py-3.5 sm:px-7">
              <span aria-hidden="true" className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#d8d3c4]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#d8d3c4]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#b88d3a]" />
              </span>
              <p className="m-0 font-mono text-[11px] text-[#4c5b6b]">Ruang redaksi — Terbitkan</p>
              <ol className="m-0 ml-auto hidden list-none items-center gap-1.5 p-0 sm:flex">
                {FLOW_STEPS.map((step, index) => {
                  const done = index < FLOW_STEPS.length - 1;
                  return (
                    <li key={step} className="flex items-center gap-1.5">
                      {index > 0 ? <span aria-hidden="true" className="h-px w-4 bg-[#cfc9b8]" /> : null}
                      <span
                        className={cn(
                          'flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] font-medium tracking-wide uppercase',
                          done ? 'bg-[#e3f2e9] text-[#0e6b4f]' : 'bg-[#1a2430] text-white',
                        )}
                      >
                        {done ? <Check className="h-3 w-3" aria-hidden="true" /> : null}
                        {step}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>

            <div className="grid lg:grid-cols-12">
              <div className="flex flex-col border-b border-[#1a2430]/10 p-6 sm:p-8 lg:col-span-5 lg:border-r lg:border-b-0">
                <p className="m-0 font-serif text-[1.5rem] leading-snug font-medium tracking-tight">
                  Emiten logistik bukukan laba bersih naik 42 persen
                </p>
                <dl className="m-0 mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-[#1a2430]/10 pt-5 text-[13px]">
                  <div>
                    <dt className="m-0 font-mono text-[10px] tracking-[0.14em] text-[#5f6b7a] uppercase">Kategori</dt>
                    <dd className="m-0 mt-1 font-medium">Korporat</dd>
                  </div>
                  <div>
                    <dt className="m-0 font-mono text-[10px] tracking-[0.14em] text-[#5f6b7a] uppercase">Penulis</dt>
                    <dd className="m-0 mt-1 font-medium">Desk Bisnis</dd>
                  </div>
                  <div>
                    <dt className="m-0 font-mono text-[10px] tracking-[0.14em] text-[#5f6b7a] uppercase">Media</dt>
                    <dd className="m-0 mt-1 font-medium">3 berkas privat</dd>
                  </div>
                  <div>
                    <dt className="m-0 font-mono text-[10px] tracking-[0.14em] text-[#5f6b7a] uppercase">Tujuan</dt>
                    <dd className="m-0 mt-1 font-medium">4 portal dipilih</dd>
                  </div>
                </dl>
                <p className={cn('m-0 mt-5 flex items-center gap-2 rounded px-3.5 py-2', GLASS_HIGHLIGHTED)}>
                  <ShieldCheck className="h-3.5 w-3.5 flex-none text-[#8a5f1c]" aria-hidden="true" />
                  <span className="font-mono text-[10px] text-[#4c5b6b]">
                    RLS · <span className="font-semibold text-[#1a2430]">organisasi</span> terverifikasi
                  </span>
                </p>
                <div className="mt-5 border-t border-[#1a2430]/10 pt-4">
                  <p className="m-0 font-mono text-[10px] tracking-[0.14em] text-[#5f6b7a] uppercase">
                    Media terlampir — 3 berkas
                  </p>
                  <ul className="m-0 mt-2.5 flex list-none gap-2 p-0">
                    <li
                      aria-label="Grafik laporan keuangan"
                      className="flex h-16 flex-1 items-center justify-center rounded bg-gradient-to-br from-[#e7e3d6] to-[#cfc9b8]"
                    >
                      <Image className="h-4 w-4 text-[#5f6b7a]" aria-hidden="true" />
                    </li>
                    <li
                      aria-label="Foto paparan publik"
                      className="flex h-16 flex-1 items-center justify-center rounded bg-gradient-to-br from-[#f5ead3] to-[#e0cd9e]"
                    >
                      <Image className="h-4 w-4 text-[#8a5f1c]" aria-hidden="true" />
                    </li>
                    <li
                      aria-label="Video konferensi pers"
                      className="flex h-16 flex-1 items-center justify-center rounded bg-gradient-to-br from-[#e3f2e9] to-[#c4ddcd]"
                    >
                      <Image className="h-4 w-4 text-[#0e6b4f]" aria-hidden="true" />
                    </li>
                  </ul>
                </div>
                <p className="m-0 mt-auto pt-5 font-mono text-[11px] text-[#5f6b7a]">
                  1.240 kata · 6 menit baca · draf tersimpan 10:38
                </p>
              </div>

              <div className="p-6 sm:p-8 lg:col-span-7">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="m-0 font-mono text-[11px] font-medium tracking-[0.14em] text-[#1a2430] uppercase">
                    Antrean distribusi
                  </p>
                  <p className="m-0 flex items-center gap-1.5 font-mono text-[11px] text-[#0e6b4f]">
                    <span aria-hidden="true" className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#149a6d] opacity-60" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#0e6b4f]" />
                    </span>
                    2/4 terkirim
                  </p>
                </div>
                <div
                  aria-hidden="true"
                  className="mt-3 h-1 overflow-hidden rounded-full bg-[#1a2430]/10"
                >
                  <div className="h-full w-1/2 rounded-full bg-[#0e6b4f]" />
                </div>
                <ul className="m-0 mt-4 grid list-none gap-2 p-0">
                  {QUEUE_ROWS.map((row) => (
                    <li
                      key={row.brand.name}
                      className="flex items-center justify-between gap-3 rounded border border-[#1a2430]/10 bg-white/70 py-2.5 pr-4 pl-3"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span
                          aria-hidden="true"
                          style={{ backgroundColor: row.brand.accent }}
                          className="w-1 flex-none self-stretch rounded-full"
                        />
                        <span className="min-w-0">
                          <span
                            aria-label={row.brand.name}
                            role="img"
                            className={cn(
                              'block truncate text-[15px] leading-tight whitespace-nowrap',
                              row.brand.wordmarkClass,
                            )}
                          >
                            <span className="text-[#1a2430]">{row.brand.head}</span>
                            <span style={{ color: row.brand.accent }}>{row.brand.tail}</span>
                          </span>
                          <span className="mt-0.5 block font-mono text-[10px] text-[#5f6b7a] tabular-nums">
                            {row.edition} · {row.detail}
                          </span>
                        </span>
                      </span>
                      <span
                        className={cn(
                          'flex-none rounded px-2 py-0.5 font-mono text-[10px] font-medium',
                          row.tone === 'done' && 'bg-[#e3f2e9] text-[#0e6b4f]',
                          row.tone === 'sending' && 'bg-[#f5ead3] text-[#8a5f1c]',
                          row.tone === 'queued' && 'bg-[#ece9e0] text-[#4c5b6b]',
                        )}
                      >
                        {row.status}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="m-0 mt-4 flex items-center gap-2 text-[13px] text-[#4c5b6b]">
                  <FileCheck2 className="h-4 w-4 flex-none text-[#0e6b4f]" aria-hidden="true" />
                  Gagal dicoba ulang otomatis · audit hanya-tambah
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-[#1a2430]/10 bg-white/60 px-5 py-4 sm:px-7">
              <p className="m-0 font-mono text-[10px] tracking-[0.16em] text-[#5f6b7a] uppercase">Terbit ke</p>
              <ul className="m-0 flex list-none flex-wrap items-center gap-x-3 gap-y-1.5 p-0">
                {NETWORK_NODES.map((node, index) => (
                  <li key={node.brand.name} className="flex items-center gap-3">
                    {index > 0 ? (
                      <span aria-hidden="true" className="text-[#cfc9b8]">
                        /
                      </span>
                    ) : null}
                    <span
                      aria-label={`${node.brand.name} — ${node.edition}`}
                      role="img"
                      className={cn('block text-[15px] leading-none whitespace-nowrap', node.brand.wordmarkClass)}
                    >
                      <span className="text-[#1a2430]">{node.brand.head}</span>
                      <span style={{ color: node.brand.accent }}>{node.brand.tail}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="m-0 ml-auto hidden font-mono text-[11px] text-[#5f6b7a] md:block">
                SEO · RSS · sitemap per portal
              </p>
            </div>
          </div>
          <figcaption className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] text-[#5f6b7a]">
            <span>Representasi mekanisme produk</span>
            <span aria-hidden="true">·</span>
            <span>PostgreSQL 17</span>
            <span aria-hidden="true">·</span>
            <span>Strict RLS</span>
            <span aria-hidden="true">·</span>
            <span>Cloudflare Edge</span>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
