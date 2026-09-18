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

export async function LandingPage() {
  const [channels, testimonials, faqs] = await Promise.all([
    getContactChannels(),
    getTestimonials(),
    getFaqs(),
  ]);
  return (
    <LandingShell>
      <Hero />
      <NetworkStrip />
      <PlatformSection />
      <InfrastructureSection />
      <CapabilityExplorer />
      <TemplateSection templates={MASTER_TEMPLATE_PRESETS} />
      <WorkflowSection />
      <AssuranceSection channels={channels} />
      <VoicesSection testimonials={testimonials} />
      <FaqTeaser faqs={faqs} />
      <ClosingCta channels={channels} />
    </LandingShell>
  );
}
