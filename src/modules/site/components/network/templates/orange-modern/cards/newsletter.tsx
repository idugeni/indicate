import { Send } from 'lucide-react';
import { TemplateButton, TemplateInput } from '@/modules/site/components/network/ui/field';

export function OrangeModernNewsletter() {
  return (
    <section id="newsletter" aria-label="Berlangganan newsletter" className="relative overflow-hidden rounded-2xl bg-[#ffedd5] px-6 py-8 md:px-10" style={{ scrollMarginTop: '5rem' }}>
      <div className="grid items-center gap-6 md:grid-cols-2">
        <div>
          <h2 className="m-0 font-sans text-2xl font-extrabold leading-tight tracking-tight text-slate-900">
            Dapatkan Berita Terbaru Langsung ke Email Anda
          </h2>
          <p className="m-0 mt-2 font-sans text-sm leading-relaxed text-slate-600">
            Berlangganan newsletter kami dan jangan lewatkan informasi penting setiap hari.
          </p>
        </div>
        <div className="min-w-0">
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <label htmlFor="orange-modern-newsletter-email" className="sr-only">
              Alamat email
            </label>
            <TemplateInput
              id="orange-modern-newsletter-email"
              type="email"
              required
              placeholder="Masukkan alamat email"
              className="h-11 w-full min-w-0 appearance-none rounded-full px-4 font-sans text-base focus:outline-none sm:flex-1 sm:text-sm"
            />
            {/* Pendaftaran dinonaktifkan sengaja hingga backend newsletter tersedia. */}
            <TemplateButton
              type="button"
              className="h-11 w-full flex-none rounded-full px-6 font-sans text-sm sm:w-auto"
            >
              Berlangganan
            </TemplateButton>
          </div>
          <p className="m-0 mt-2.5 font-sans text-xs text-slate-600">
            Kami menghargai privasi Anda. Tidak ada spam, hanya berita penting.
          </p>
        </div>
      </div>
      <Send aria-hidden="true" className="pointer-events-none absolute -right-4 bottom-6 hidden h-28 w-28 rotate-12 text-[#ea580c]/25 md:block" />
    </section>
  );
}
