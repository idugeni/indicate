import { Section } from '@/modules/site/components/layout/content';
import { getTestimonials } from '@/modules/content/site-content';

export async function TestimonialsSection() {
  const items = await getTestimonials();
  if (items.length === 0) return null;
  return (
    <Section
      title="Kata pengelola jaringan"
      eyebrow="Testimoni"
      description="Evaluasi pengelola grup media multi-portal mengenai keandalan sindikasi sinyal, efisiensi kerja redaksi terpusat, dan isolasi tenant."
      tone="warm"
    >
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item) => (
          <figure
            key={item.author}
            className="m-0 flex flex-col justify-between gap-5 rounded-lg border border-hairline bg-bg-raised p-5 sm:p-6"
          >
            <blockquote className="m-0 font-serif text-base leading-relaxed text-paper">
              &ldquo;{item.quote}&rdquo;
            </blockquote>
            <figcaption className="border-t border-hairline pt-4 font-sans text-xs">
              <strong className="block font-semibold text-paper">{item.author}</strong>
              <span className="mt-0.5 block text-paper-faint">
                {item.role} · {item.media}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </Section>
  );
}
