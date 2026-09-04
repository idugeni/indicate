import { Section } from '@/modules/site/components/layout/content';
import { getFaqs } from '@/modules/content/site-content';

/** Zero-JS RSC FAQ: answers render directly (no accordion) so crawlers index every Q&A. */
export async function FaqSection() {
  const items = await getFaqs();
  if (items.length === 0) return null;
  return (
    <Section
      title="Pertanyaan umum"
      eyebrow="FAQ"
      description="Jawaban atas pertanyaan seputar teknis, lisensi, dan infrastruktur Indicate."
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {items.map((faq, index) => (
          <article
            key={faq.id}
            id={faq.id}
            className="scroll-mt-24 rounded-lg border border-hairline bg-bg-raised p-5 transition-colors duration-180 hover:border-hairline-strong sm:p-6"
          >
            <h3 className="m-0 flex items-baseline gap-3 font-sans text-sm font-semibold tracking-tight text-paper">
              <span className="font-mono text-[11px] font-normal tabular-nums text-brass">
                {String(index + 1).padStart(2, '0')}
              </span>
              {faq.question}
            </h3>
            <p className="m-0 mt-2 pl-8 font-sans text-sm leading-relaxed text-paper-dim">
              {faq.answer}
            </p>
          </article>
        ))}
      </div>
    </Section>
  );
}
