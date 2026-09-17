import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { WORKFLOW_STEPS } from '@/ui/site/marketing-content';
import { Eyebrow } from '@/modules/site/components/landing/material';

export function WorkflowSection() {
  return (
    <section aria-labelledby="memulai-heading" className="border-y border-[#e2ded2] bg-[#ece9e0]">
      <div className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-8 md:py-24">
        <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <Eyebrow index="05">Memulai</Eyebrow>
            <h2
              id="memulai-heading"
              className="m-0 mt-4 font-serif text-3xl leading-[1.05] font-medium tracking-tight text-balance sm:text-[2.75rem]"
            >
              Dari obrolan pertama hingga <em className="text-[#8a5f1c]">tayang</em>.
            </h2>
          </div>
          <p className="m-0 max-w-md leading-relaxed text-[#4c5b6b] lg:col-span-4">
            Tanpa instalasi, tanpa proyek migrasi berbulan-bulan. Anda terima beres — kami yang mengurus mesinnya.
          </p>
        </div>
        <ol className="m-0 mt-12 grid list-none gap-px overflow-hidden rounded-lg border border-[#1a2430]/15 bg-[#1a2430]/15 p-0 sm:grid-cols-2 lg:grid-cols-5">
          {WORKFLOW_STEPS.map((step, index) => (
            <li key={step.title} className="group bg-[#f4f2ec] p-6 transition-colors duration-180 hover:bg-white">
              <p className="m-0 flex items-center justify-between font-mono text-[11px] tabular-nums">
                <span className="text-[#b88d3a]">{String(index + 1).padStart(2, '0')}</span>
                <span className="text-[#cfc9b8]">/ 05</span>
              </p>
              <span aria-hidden="true" className="mt-4 block h-0.5 w-full bg-[#1a2430]/10">
                <span className="block h-full w-0 bg-[#b88d3a] transition-all duration-300 group-hover:w-full" />
              </span>
              <h3 className="m-0 mt-4 font-serif text-xl leading-tight font-medium tracking-tight">{step.title}</h3>
              <p className="m-0 mt-2 text-[13px] leading-relaxed text-[#4c5b6b]">{step.description}</p>
            </li>
          ))}
        </ol>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link
            href="/contact"
            className="group inline-flex items-center gap-2 rounded bg-[#1a2430] px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_36px_-16px_rgba(26,36,48,0.55)] transition-all duration-180 hover:-translate-y-0.5 hover:bg-[#2b3a4b] active:translate-y-0 active:bg-[#141d27]"
          >
            Mulai dari langkah pertama
            <ArrowRight className="h-4 w-4 transition-transform duration-180 group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
          <p className="m-0 font-mono text-[11px] text-[#5f6b7a]">Didampingi manusia — bukan bot.</p>
        </div>
      </div>
    </section>
  );
}
