import { Container, SecondaryCta } from '@/modules/site/components/layout/content';
import { FaqGrid } from '@/modules/site/components/sections/faq-grid';
import { getFaqs } from '@/modules/content/site-content';

/** Landing teaser (first answers) with load-more; full crawlable index lives on /faq. */
export async function FaqSection() {
  const items = await getFaqs();
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="pertanyaan-umum-heading" className="border-t border-hairline">
      <Container className="grid gap-10 py-14 md:py-20 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)]">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <p className="m-0 flex items-center gap-2.5 font-mono text-xs font-medium tracking-wide text-brass">
            <span aria-hidden="true" className="h-px w-8 flex-none bg-brass/70" />
            FAQ
          </p>
          <h2 id="pertanyaan-umum-heading" className="m-0 mt-4 font-serif text-3xl font-medium leading-[1.12] tracking-tight text-balance text-paper sm:text-4xl">
            Pertanyaan umum
          </h2>
          <p className="m-0 mt-4 max-w-md font-sans text-base leading-relaxed text-paper-dim">
            Jawaban seputar teknis, lisensi, dan infrastruktur. Indeks lengkap
            tersedia di halaman FAQ.
          </p>
          <div className="mt-6">
            <SecondaryCta href="/faq">
              <span>Lihat semua jawaban</span>
            </SecondaryCta>
          </div>
        </div>
        <FaqGrid items={items} />
      </Container>
    </section>
  );
}
