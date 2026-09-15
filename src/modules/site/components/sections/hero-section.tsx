import { ArrowRight } from 'lucide-react';
import { SERVICE_SUMMARY, SERVICE_TAGLINE } from '@/ui/site/marketing-content';
import { LivePreviewSection } from '@/modules/site/components/sections/live-preview-section';
import { Container, PrimaryCta, SecondaryCta } from '@/modules/site/components/layout/content';
import { SignalNetwork } from '@/modules/site/components/sections/signal-network';

export function HeroSection() {
  return (
    <>
      <section className="border-b border-hairline">
        <Container className="pb-12 pt-14 md:pb-16 md:pt-20">
          <p className="m-0 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs tracking-wide text-paper-faint">
            <span className="flex items-center gap-1.5 text-signal">
              <span className="h-1.5 w-1.5 bg-signal" aria-hidden="true" />
              Jaringan langsung
            </span>
            <span aria-hidden="true" className="text-hairline-strong">/</span>
            <span>Satu sinyal, ratusan kanal distribusi</span>
          </p>
          <h1 className="m-0 mt-6 max-w-[20ch] font-serif text-[clamp(2.75rem,7vw,4.75rem)] font-medium leading-[1.04] tracking-tight text-balance text-paper">
            {SERVICE_TAGLINE}
          </h1>
          <p className="m-0 mt-6 max-w-2xl font-sans text-lg leading-relaxed text-paper-dim">
            {SERVICE_SUMMARY}
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <PrimaryCta href="/contact">
              <span>Mulai konsultasi redaksi</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </PrimaryCta>
            <SecondaryCta href="/services">
              <span>Spesifikasi infrastruktur</span>
            </SecondaryCta>
          </div>
          <div className="mt-14 grid gap-10 border-t border-hairline pt-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)]">
            <div>
              <h2 className="m-0 font-serif text-xl font-medium leading-snug tracking-tight text-paper">
                Satu naskah masuk, seluruh jaringan menjawab.
              </h2>
              <p className="m-0 mt-3 max-w-md font-sans text-base leading-relaxed text-paper-dim">
                Setiap baris di samping adalah tujuan terbit yang nyata — statusnya
                terbaca per kanal, bukan sekadar ilustrasi.
              </p>
            </div>
            <SignalNetwork />
          </div>
        </Container>
      </section>

      <Container className="py-14 md:py-20">
        <LivePreviewSection />
      </Container>
    </>
  );
}
