import Link from 'next/link';
import { ArrowRight, CalendarCheck2 } from 'lucide-react';
import { GLASS_ELEVATED, GLASS_HIGHLIGHTED } from '@/modules/site/components/landing/material';
import type { FeatureItem } from '@/ui/site/marketing-content';
import { cn } from '@/ui/cn';

export function ClosingCta({ channels }: { readonly channels: readonly FeatureItem[] }) {
  const line = channels
    .filter((channel) => channel.href)
    .map((channel) => channel.title)
    .join(' · ');
  return (
    <section aria-labelledby="mulai-heading" className="mx-auto w-full max-w-7xl px-5 pb-16 sm:px-8 md:pb-24">
      <div className={cn('relative overflow-hidden rounded-lg px-6 py-12 text-center sm:px-12 md:py-16', GLASS_ELEVATED)}>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(44rem_22rem_at_50%_-9rem,rgba(184,141,58,0.18),transparent_70%),linear-gradient(rgba(26,36,48,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(26,36,48,0.05)_1px,transparent_1px)] bg-[size:auto,2.75rem_2.75rem,2.75rem_2.75rem] [mask-image:linear-gradient(to_bottom,black,transparent_94%)]"
        />
        <div className="relative mx-auto max-w-2xl">
          <p className="m-0 flex justify-center">
            <span className={cn('inline-flex items-center gap-2 rounded-full px-4 py-1.5', GLASS_HIGHLIGHTED)}>
              <CalendarCheck2 className="h-3.5 w-3.5 flex-none text-[#8a5f1c]" aria-hidden="true" />
              <span className="font-mono text-[10px] tracking-[0.14em] text-[#4c5b6b] uppercase">
                Aktif ≤ 1×24 jam setelah konfirmasi
              </span>
            </span>
          </p>
          <p className="m-0 mt-6 font-mono text-[11px] tracking-[0.18em] text-[#8a5f1c] uppercase">Siap bermigrasi</p>
          <h2
            id="mulai-heading"
            className="m-0 mt-4 font-serif text-3xl leading-[1.04] font-medium tracking-tight text-balance sm:text-5xl"
          >
            Konsolidasikan seluruh jaringan redaksi Anda.
          </h2>
          <p className="m-0 mx-auto mt-5 max-w-xl leading-relaxed text-[#4c5b6b]">
            Sampaikan jumlah domain dan unit yang direncanakan — tim kami menyusun arsitektur penyiapan beserta
            estimasinya, tanpa mengganggu operasi redaksi yang berjalan.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/contact"
              className="group inline-flex items-center gap-2 rounded bg-[#1a2430] px-7 py-3.5 text-sm font-semibold text-white shadow-[0_18px_36px_-16px_rgba(26,36,48,0.55)] transition-all duration-180 hover:-translate-y-0.5 hover:bg-[#2b3a4b] active:translate-y-0 active:bg-[#141d27]"
            >
              Jadwalkan diskusi arsitektur
              <ArrowRight className="h-4 w-4 transition-transform duration-180 group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
            <Link
              href="/services"
              className="inline-flex items-center gap-2 rounded border border-[#cfc9b8] bg-white/70 px-7 py-3.5 text-sm font-semibold backdrop-blur transition-all duration-180 hover:-translate-y-0.5 hover:border-[#1a2430]/40 hover:bg-white active:translate-y-0"
            >
              Lihat layanan
            </Link>
          </div>
          {line ? (
            <p className="m-0 mt-7 font-mono text-[11px] tracking-wide text-[#5f6b7a]">{line}</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
