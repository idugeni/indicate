import { ArrowRight, Layers } from 'lucide-react';
import { SERVICE_SUMMARY, SERVICE_TAGLINE } from '@/ui/site/marketing-content';
import { LivePreviewSection } from '@/modules/site/components/sections/live-preview-section';
import { Container, PrimaryCta, SecondaryCta } from '@/modules/site/components/layout/content';
import { SignalNetwork } from '@/modules/site/components/sections/signal-network';
import { cn } from '@/ui/cn';

export function HeroSection() {
  return (
    <>
      <section className="bg-[radial-gradient(circle_at_1px_1px,color-mix(in_srgb,var(--hairline)_55%,transparent)_1px,transparent_0)] bg-[size:22px_22px]">
        <Container className="grid min-h-[calc(100svh-3.5rem)] content-center gap-10 py-14 md:py-20 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-center">
          <div>
            <p className="m-0 flex items-center gap-2.5 font-mono text-xs font-medium uppercase tracking-wider text-brass">
              <span aria-hidden="true" className="h-px w-8 flex-none bg-brass/70" />
              Satu sinyal · ratusan kanal distribusi
            </p>
            <h1 className="m-0 mt-5 max-w-[22ch] font-sans text-4xl font-bold leading-[1.08] tracking-[-0.03em] text-balance text-paper sm:text-5xl">
              {SERVICE_TAGLINE}
            </h1>
            <p className="m-0 mt-5 max-w-xl font-sans text-base leading-relaxed text-paper-dim">
              {SERVICE_SUMMARY}
            </p>
            <div className={cn('mt-8 flex flex-wrap items-center gap-3')}>
              <PrimaryCta href="/contact">
                <span>Mulai Konsultasi Redaksi</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </PrimaryCta>
              <SecondaryCta href="/services">
                <Layers className="h-4 w-4 text-brass" aria-hidden="true" />
                <span>Spesifikasi Infrastruktur</span>
              </SecondaryCta>
            </div>
            <p className="m-0 mt-8 flex flex-wrap gap-x-2 gap-y-1 font-mono text-[11px] tracking-wide text-paper-faint">
              <span>Multi-tenant</span>
              <span aria-hidden="true" className="text-hairline-strong">·</span>
              <span>Antrean terisolasi per target</span>
              <span aria-hidden="true" className="text-hairline-strong">·</span>
              <span>Audit hanya-tambah</span>
            </p>
          </div>

          <div className="rounded-lg border border-hairline bg-bg-raised p-5 sm:p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-hairline pb-4">
              <h2 className="m-0 font-mono text-[11px] font-medium uppercase tracking-wider text-paper-dim">
                Peta sinyal jaringan
              </h2>
              <p className="m-0 flex items-center gap-1.5 font-mono text-[11px] tabular-nums text-signal">
                <span className="h-1.5 w-1.5 bg-signal" aria-hidden="true" />
                <span>Langsung · RTT &lt; 45ms</span>
              </p>
            </div>
            <div className="mt-2">
              <SignalNetwork />
            </div>
          </div>
        </Container>
      </section>

      <Container className="py-14 md:py-20">
        <LivePreviewSection />
      </Container>
    </>
  );
}
