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
    >
      <div className="grid gap-x-10 gap-y-8 md:grid-cols-2">
        {items.map((item) => (
          <figure key={item.author} className="m-0 border-l-2 border-brass/60 pl-5">
            <blockquote className="m-0 font-serif text-base leading-relaxed text-paper">
              &ldquo;{item.quote}&rdquo;
            </blockquote>
            <figcaption className="mt-4 font-sans text-xs">
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
