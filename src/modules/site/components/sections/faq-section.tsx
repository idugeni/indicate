import { Section } from '@/modules/site/components/layout/content';
import { FaqGrid } from '@/modules/site/components/sections/faq-grid';
import { getFaqs } from '@/modules/content/site-content';

/** Landing teaser (first answers) with load-more; full crawlable index lives on /faq. */
export async function FaqSection() {
  const items = await getFaqs();
  if (items.length === 0) return null;
  return (
    <Section
      title="Pertanyaan umum"
      eyebrow="FAQ"
      description="Jawaban atas pertanyaan seputar teknis, lisensi, dan infrastruktur Indicate."
    >
      <FaqGrid items={items} />
    </Section>
  );
}
