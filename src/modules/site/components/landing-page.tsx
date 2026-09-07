import { Suspense } from 'react';

import { CapabilitiesSection } from '@/modules/site/components/sections/capabilities-section';
import { FaqSection } from '@/modules/site/components/sections/faq-section';
import { HeroSection } from '@/modules/site/components/sections/hero-section';
import { LogoCloudSection } from '@/modules/site/components/sections/logo-cloud-section';
import { PricingSection } from '@/modules/site/components/sections/pricing-section';
import { ProofStatsSection } from '@/modules/site/components/sections/proof-stats-section';
import { SecuritySection } from '@/modules/site/components/sections/security-section';
import { CallToAction, SiteShell } from '@/modules/site/components/layout/site-shell';
import { TemplateShowcaseSection } from '@/modules/site/components/sections/template-showcase-section';
import { TestimonialsSection } from '@/modules/site/components/sections/testimonials-section';
import { WhyIndicateSection } from '@/modules/site/components/sections/why-indicate-section';
import { WorkflowSection } from '@/modules/site/components/sections/workflow-section';
import { getColorPresets, getTemplatePresets } from '@/modules/content/site-content';

/** Below-fold island: preset DB reads stream after the hero paints (LCP). */
async function TemplateShowcaseWithData() {
  const [templates, colors] = await Promise.all([getTemplatePresets(), getColorPresets()]);
  return <TemplateShowcaseSection templates={templates} colors={colors} />;
}

function TemplateShowcaseFallback() {
  return (
    <div aria-busy="true" aria-label="Memuat etalase template" className="mx-auto w-full max-w-6xl px-6 py-14 md:py-20">
      <div className="h-4 w-40 animate-pulse rounded bg-bg-raised-2" />
      <div className="mt-4 h-10 w-3/4 animate-pulse rounded bg-bg-raised-2" />
      <div className="mt-4 min-h-[420px] animate-pulse rounded-lg border border-hairline bg-bg-raised" />
    </div>
  );
}

export function LandingPage() {
  return (
    <SiteShell>
      <div className="flex flex-col">
        <HeroSection />
        <LogoCloudSection />
        <ProofStatsSection />
        <SecuritySection />
        <WhyIndicateSection />
        <WorkflowSection />
        <Suspense fallback={<TemplateShowcaseFallback />}>
          <TemplateShowcaseWithData />
        </Suspense>
        <CapabilitiesSection />
        <TestimonialsSection />
        <PricingSection />
        <FaqSection />
        <CallToAction />
      </div>
    </SiteShell>
  );
}