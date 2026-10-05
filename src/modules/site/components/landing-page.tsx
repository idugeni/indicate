import { Suspense } from 'react';

import { AssuranceSection } from '@/modules/site/components/landing/assurance-section';
import { CapabilityExplorer } from '@/modules/site/components/landing/capability-explorer';
import { ClosingCta } from '@/modules/site/components/landing/closing-cta';
import { Hero } from '@/modules/site/components/landing/hero';
import { InfrastructureSection } from '@/modules/site/components/landing/infrastructure-section';
import { LandingShell } from '@/modules/site/components/landing/landing-shell';
import { NetworkStrip } from '@/modules/site/components/landing/network-strip';
import { PlatformSection } from '@/modules/site/components/landing/platform-section';
import { TemplateSection } from '@/modules/site/components/landing/template-section';
import { FaqTeaser, VoicesSection } from '@/modules/site/components/landing/voices-faq';
import { WorkflowSection } from '@/modules/site/components/landing/workflow-section';
import { getContactChannels, getFaqs, getTestimonials } from '@/modules/content/site-content';
import { MASTER_TEMPLATE_PRESETS } from '@/ui/themes';

async function AssuranceLoader() {
  const channels = await getContactChannels();
  return <AssuranceSection channels={channels} />;
}

async function VoicesLoader() {
  const testimonials = await getTestimonials();
  return <VoicesSection testimonials={testimonials} />;
}

async function FaqLoader() {
  const faqs = await getFaqs();
  return <FaqTeaser faqs={faqs} />;
}

async function ClosingLoader() {
  const channels = await getContactChannels();
  return <ClosingCta channels={channels} />;
}

/**
 * Render halaman utama control-plane tanpa fallback pemuatan layar penuh.
 *
 * @returns Cangkang landing dengan bagian dinamis yang streaming per-seksi.
 * @remarks Await tingkat atas di sini men-suspend seluruh rute sehingga
 * `src/app/loading.tsx` (spinner fullscreen) sempat ter-cat sebelum konten
 * apa pun tampil. Cangkang statis kini render instan; hanya seksi
 * berbasis DB yang suspend di dalam `Suspense` ber-fallback `null`.
 */
export function LandingPage() {
  return (
    <LandingShell>
      <Hero />
      <NetworkStrip />
      <PlatformSection />
      <InfrastructureSection />
      <CapabilityExplorer />
      <TemplateSection templates={MASTER_TEMPLATE_PRESETS} />
      <WorkflowSection />
      <Suspense fallback={null}>
        <AssuranceLoader />
      </Suspense>
      <Suspense fallback={null}>
        <VoicesLoader />
      </Suspense>
      <Suspense fallback={null}>
        <FaqLoader />
      </Suspense>
      <Suspense fallback={null}>
        <ClosingLoader />
      </Suspense>
    </LandingShell>
  );
}
