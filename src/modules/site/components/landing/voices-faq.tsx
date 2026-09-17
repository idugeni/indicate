import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { FaqRow, TestimonialRow } from '@/data/repos/content/queries';
import { Eyebrow, SectionShell } from '@/modules/site/components/landing/material';

export function VoicesSection({ testimonials }: { readonly testimonials: readonly TestimonialRow[] }) {
  if (testimonials.length === 0) return null;
  const [featured, ...rest] = testimonials;
  if (!featured) return null;
  return (
    <section aria-labelledby="suara-heading" className="border-y border-[#e2ded2] bg-white">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-16 sm:px-8 md:py-24 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-28">
            <Eyebrow>Suara pelanggan</Eyebrow>
            <h2
              id="suara-heading"
              className="m-0 mt-4 font-serif text-3xl leading-[1.05] font-medium tracking-tight text-balance sm:text-[2.75rem]"
            >
              Redaksi yang sudah <em className="text-[#8a5f1c]">konsolidasi</em>.
            </h2>
          </div>
        </div>
        <div className="lg:col-span-8">
          <figure className="m-0 border-t border-[#1a2430]/10 pt-6">
            <blockquote className="m-0 max-w-3xl font-serif text-[1.65rem] leading-[1.2] font-medium tracking-tight text-balance sm:text-4xl">
              “{featured.quote}”
            </blockquote>
            <figcaption className="m-0 mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-sm font-semibold">{featured.author}</span>
              <span className="text-sm text-[#4c5b6b]">
                {featured.role} · {featured.media}
              </span>
            </figcaption>
          </figure>
          {rest.length > 0 ? (
            <div className="mt-8 grid gap-8 sm:grid-cols-2">
              {rest.slice(0, 2).map((item) => (
                <figure key={`${item.author}-${item.media}`} className="m-0 border-t border-[#1a2430]/15 pt-5">
                  <blockquote className="m-0 font-serif text-lg leading-snug tracking-tight text-balance">
                    “{item.quote}”
                  </blockquote>
                  <figcaption className="m-0 mt-3 text-[13px] text-[#4c5b6b]">
                    <span className="font-semibold text-[#1a2430]">{item.author}</span> · {item.role} · {item.media}
                  </figcaption>
                </figure>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function FaqTeaser({ faqs }: { readonly faqs: readonly FaqRow[] }) {
  const preview = faqs.slice(0, 6);
  if (preview.length === 0) return null;
  return (
    <SectionShell labelledBy="faq-heading" className="border-t border-[#e2ded2] py-16 md:py-24">
      <div className="grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-28">
            <Eyebrow index="07">Pertanyaan umum</Eyebrow>
            <h2
              id="faq-heading"
              className="m-0 mt-4 font-serif text-3xl leading-[1.05] font-medium tracking-tight text-balance sm:text-[2.75rem]"
            >
              Dijawab <em className="text-[#8a5f1c]">terus terang</em>.
            </h2>
            <Link
              href="/faq"
              className="group mt-7 inline-flex items-center gap-2 text-sm font-semibold underline decoration-[#b88d3a] decoration-2 underline-offset-8 transition-colors hover:text-[#8a5f1c]"
            >
              Buka {faqs.length} pertanyaan di pusat bantuan
              <ArrowRight className="h-4 w-4 transition-transform duration-180 group-hover:translate-x-1" aria-hidden="true" />
            </Link>
          </div>
        </div>
        <dl className="m-0 grid content-start gap-0 border-t border-[#1a2430]/15 p-0 lg:col-span-7">
          {preview.map((faq, index) => (
            <div key={faq.id} className="grid gap-1 border-b border-[#1a2430]/15 py-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-5">
              <dt className="m-0 font-mono text-[11px] text-[#b88d3a] tabular-nums sm:pt-1">
                {String(index + 1).padStart(2, '0')}
              </dt>
              <div>
                <dt className="m-0 font-serif text-xl leading-snug font-medium tracking-tight">{faq.question}</dt>
                <dd className="m-0 mt-1.5 max-w-2xl text-sm leading-relaxed text-[#4c5b6b]">{faq.answer}</dd>
              </div>
            </div>
          ))}
        </dl>
      </div>
    </SectionShell>
  );
}
