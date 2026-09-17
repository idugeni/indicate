import Link from 'next/link';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { GUARANTEES, type FeatureItem } from '@/ui/site/marketing-content';
import { Eyebrow, GLASS_HIGHLIGHTED, SectionShell } from '@/modules/site/components/landing/material';
import { cn } from '@/ui/cn';

export function AssuranceSection({ channels }: { readonly channels: readonly FeatureItem[] }) {
  const linked = channels.filter((channel) => channel.href);
  return (
    <SectionShell labelledBy="kepastian-heading" className="py-16 md:py-24">
      <div className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Eyebrow index="06">Kepastian biaya</Eyebrow>
          <h2
            id="kepastian-heading"
            className="m-0 mt-4 font-serif text-3xl leading-[1.05] font-medium tracking-tight text-balance sm:text-[2.75rem]"
          >
            Biaya disepakati di depan. <em className="text-[#8a5f1c]">Tanpa paket.</em>
          </h2>
          <ol className="m-0 mt-10 grid list-none gap-0 border-t border-[#1a2430]/15 p-0">
            {GUARANTEES.map((item, index) => (
              <li
                key={item.title}
                className="group relative grid gap-1 border-b border-[#1a2430]/15 py-5 transition-all duration-180 hover:pl-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-5"
              >
                <span
                  aria-hidden="true"
                  className="absolute top-5 bottom-5 left-0 w-0.5 origin-center scale-y-0 rounded-full bg-[#b88d3a] transition-transform duration-180 group-hover:scale-y-100"
                />
                <span aria-hidden="true" className="font-mono text-[11px] text-[#b88d3a] tabular-nums sm:pt-1">
                  G.{String(index + 1).padStart(2, '0')}
                </span>
                <span>
                  <span className="block font-serif text-xl leading-snug font-medium tracking-tight">
                    {item.title}
                  </span>
                  <span className="mt-1 block max-w-xl text-sm leading-relaxed text-[#4c5b6b]">
                    {item.description}
                  </span>
                </span>
              </li>
            ))}
          </ol>
          <Link
            href="/pricing"
            className="group mt-7 inline-flex items-center gap-2 text-sm font-semibold underline decoration-[#b88d3a] decoration-2 underline-offset-8 transition-colors hover:text-[#8a5f1c]"
          >
            Rincian lengkap di halaman harga
            <ArrowRight className="h-4 w-4 transition-transform duration-180 group-hover:translate-x-1" aria-hidden="true" />
          </Link>
        </div>
        <div className="lg:col-span-5">
          <div className={cn('rounded-lg p-7 sm:p-8 lg:sticky lg:top-28', GLASS_HIGHLIGHTED)}>
            <p className="m-0 font-mono text-[11px] tracking-[0.14em] text-[#8a5f1c] uppercase">Berapa biayanya?</p>
            <p className="m-0 mt-3 font-serif text-[1.65rem] leading-[1.15] font-medium tracking-tight">
              Satu angka pasti, disepakati sebelum Anda membayar apa pun.
            </p>
            <p className="m-0 mt-4 text-sm leading-relaxed text-[#4c5b6b]">
              Ceritakan kebutuhan dan jumlah situs Anda lewat WhatsApp atau surel. Tidak ada tingkatan, tidak ada
              kuota fitur yang dikunci.
            </p>
            <div className="mt-6 grid gap-2">
              <Link
                href="/contact"
                className="group inline-flex items-center justify-center gap-2 rounded bg-[#1a2430] px-6 py-3 text-sm font-semibold text-white transition-all duration-180 hover:-translate-y-0.5 hover:bg-[#2b3a4b] active:translate-y-0 active:bg-[#141d27]"
              >
                Minta penawaran
                <ArrowRight className="h-4 w-4 transition-transform duration-180 group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center rounded border border-[#cfc9b8] bg-white/60 px-6 py-3 text-sm font-semibold backdrop-blur transition-all duration-180 hover:-translate-y-0.5 hover:border-[#1a2430]/40 hover:bg-white active:translate-y-0"
              >
                Lihat halaman harga
              </Link>
            </div>
            <ul className="m-0 mt-6 grid list-none gap-0 border-t border-[#8a5f1c]/20 p-0 pt-2">
              {linked.slice(0, 3).map((channel) => (
                <li key={channel.title} className="border-b border-[#8a5f1c]/15 last:border-b-0">
                  <a
                    href={channel.href}
                    {...(channel.href?.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    className="group flex items-center justify-between gap-3 py-3"
                  >
                    <span className="text-sm font-semibold tracking-tight">{channel.title}</span>
                    <ArrowUpRight
                      aria-hidden="true"
                      className="h-4 w-4 flex-none text-[#5f6b7a] transition-all duration-180 group-hover:translate-x-0.5 group-hover:text-[#8a5f1c]"
                    />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </SectionShell>
  );
}
