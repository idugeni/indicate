import { Leaf } from 'lucide-react';
import { TemplateButton, TemplateInput } from '@/modules/site/components/network/ui/field';

export function GreenMinimalNewsletter() {
  return (
    <section id="newsletter" aria-label="Berlangganan newsletter" className="relative overflow-hidden rounded-2xl bg-[#e0f0e5] px-6 py-8 md:px-10" style={{ scrollMarginTop: '5rem' }}>
      <div className="grid items-center gap-6 md:grid-cols-2">
        <div>
          <p className="m-0 flex items-center gap-2 font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-[#1d7a38]">
            <Leaf className="h-4 w-4" aria-hidden="true" />
            Langganan Newsletter
          </p>
          <h2 className="m-0 mt-2 font-sans text-2xl font-extrabold leading-tight tracking-tight text-slate-900">
            Dapatkan Berita Terbaru Langsung di Email Anda
          </h2>
          <p className="m-0 mt-2 font-sans text-sm leading-relaxed text-slate-600">
            Berita penting, dikurasi setiap hari. Tanpa spam, hanya informasi berkualitas.
          </p>
        </div>
        <div className="min-w-0">
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <label htmlFor="green-minimal-newsletter-email" className="sr-only">
              Alamat email
            </label>
            <TemplateInput
              id="green-minimal-newsletter-email"
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
      <p className="m-0 mt-4 font-sans text-lg italic leading-relaxed text-[#1d7a38]">
        Informasi untuk masa depan yang lebih baik
      </p>
      <Leaf aria-hidden="true" className="pointer-events-none absolute -right-4 bottom-6 hidden h-28 w-28 rotate-12 text-[#1d7a38]/25 md:block" />
    </section>
  );
}
