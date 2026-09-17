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
import { CONTACT_CHANNELS, FAQ_ITEMS, TESTIMONIALS } from '@/ui/site/marketing-content';
import { MASTER_TEMPLATE_PRESETS } from '@/ui/themes';

const STATIC_FAQS = Object.freeze(
  FAQ_ITEMS.map((item, index) =>
    Object.freeze({
      id: item.id ?? `faq-${index + 1}`,
      question: item.question,
      answer: item.answer,
    }),
  ),
);

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
      <AssuranceSection channels={CONTACT_CHANNELS} />
      <VoicesSection testimonials={TESTIMONIALS} />
      <FaqTeaser faqs={STATIC_FAQS} />
      <ClosingCta channels={CONTACT_CHANNELS} />
    </LandingShell>
  );
}
