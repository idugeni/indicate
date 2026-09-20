import { Mail } from 'lucide-react';
import { TemplateButton, TemplateInput } from '@/modules/site/components/network/ui/field';

/**
 * Kartu newsletter gradien biru terang gaya contoh Kabar.id.
 *
 * @returns Kartu langganan dengan ikon amplop dan form email.
 */
export function GlassyBlueNewsletter() {
  return (
    <section
      id="newsletter"
      aria-label="Berlangganan newsletter"
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#dbeafe] via-[#eef5ff] to-white px-6 py-8 shadow-lg shadow-[#1f7cff]/10 ring-1 ring-white md:px-10"
      style={{ scrollMarginTop: '5rem' }}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <span className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-[#1f7cff]/15 blur-3xl" />
        <span className="absolute -bottom-12 -left-8 h-40 w-40 rounded-full bg-[#7db4ff]/20 blur-3xl" />
      </div>
      <div className="relative grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex items-start gap-4">
          <span aria-hidden="true" className="flex h-14 w-14 flex-none items-center justify-center rounded-2xl bg-gradient-to-br from-[#1f7cff] to-[#4aa3ff] text-white shadow-lg shadow-[#1f7cff]/30">
            <Mail className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <p className="m-0 font-sans text-[11px] font-bold uppercase tracking-[0.16em] text-[#1f7cff]">
              Berlangganan newsletter
            </p>
            <h2 className="m-0 mt-1 font-sans text-2xl font-extrabold leading-tight tracking-tight text-slate-900">
              Dapatkan Berita Terbaru Langsung ke Email Anda
            </h2>
            <p className="m-0 mt-1.5 font-sans text-sm leading-relaxed text-slate-600">
              Berita penting, dikurasi setiap hari. Tanpa spam, hanya informasi berkualitas.
            </p>
          </div>
        </div>
        <div className="min-w-0">
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <label htmlFor="glassy-blue-newsletter-email" className="sr-only">
              Alamat email
            </label>
            <TemplateInput
              id="glassy-blue-newsletter-email"
              type="email"
              required
              placeholder="Masukkan alamat email"
              className="h-11 w-full min-w-0 appearance-none rounded-full px-4 font-sans text-base shadow-sm focus:outline-none sm:flex-1 sm:text-sm"
            />
            <TemplateButton
              type="button"
              className="h-11 w-full flex-none rounded-full px-6 font-sans text-sm shadow-md sm:w-auto"
            >
              Berlangganan
            </TemplateButton>
          </div>
          <p className="m-0 mt-2.5 font-sans text-xs text-slate-600">
            Kami menghargai privasi Anda. Tidak ada spam, hanya berita penting.
          </p>
        </div>
      </div>
    </section>
  );
}
