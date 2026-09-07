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

export async function LandingPage() {
  const [templates, colors] = await Promise.all([getTemplatePresets(), getColorPresets()]);
  return (
    <SiteShell>
      <div className="flex flex-col">
        <HeroSection />
        <LogoCloudSection />
        <ProofStatsSection />
        <SecuritySection />
        <WhyIndicateSection />
        <WorkflowSection />
        <TemplateShowcaseSection templates={templates} colors={colors} />
        <CapabilitiesSection />
        <TestimonialsSection />
        <PricingSection />
        <FaqSection />
        <CallToAction />
      </div>
    </SiteShell>
  );
}