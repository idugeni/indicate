import Link from 'next/link';
import { Send } from 'lucide-react';

export function CleanBlueNewsletter() {
  return (
    <section id="newsletter" aria-label="Berlangganan newsletter" className="relative overflow-hidden rounded-2xl bg-[#e8f0fe] px-6 py-8 md:px-10" style={{ scrollMarginTop: '5rem' }}>
      <div className="grid items-center gap-6 md:grid-cols-2">
        <div>
          <h2 className="m-0 font-sans text-2xl font-extrabold leading-tight tracking-tight text-slate-900">
            Dapatkan Berita Terbaru Langsung ke Email Anda
          </h2>
          <p className="m-0 mt-2 font-sans text-sm leading-relaxed text-slate-600">
            Berlangganan newsletter kami dan jangan lewatkan informasi penting setiap hari.
          </p>
        </div>
        <div>
          <p className="m-0 flex flex-col gap-2.5 sm:flex-row">
            <label htmlFor="clean-blue-newsletter-email" className="sr-only">
              Alamat email
            </label>
            <input
              id="clean-blue-newsletter-email"
              type="email"
              required
              placeholder="Masukkan alamat email"
              className="h-11 w-full flex-1 rounded-full border border-slate-200 bg-white px-4 font-sans text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#1a5fd0] focus:outline-none"
            />
            {/* Pendaftaran dinonaktifkan sengaja hingga backend newsletter tersedia. */}
            <Link
              href=""
              className="inline-flex h-11 flex-none items-center justify-center rounded-full bg-[#1a5fd0] px-6 font-sans text-sm font-bold text-white transition-colors hover:bg-[#155cb8]"
            >
              Berlangganan
            </Link>
          </p>
          <p className="m-0 mt-2.5 font-sans text-xs text-slate-600">
            Kami menghargai privasi Anda. Tidak ada spam, hanya berita penting.
          </p>
        </div>
      </div>
      <Send aria-hidden="true" className="pointer-events-none absolute -right-4 bottom-6 hidden h-28 w-28 rotate-12 text-[#1a5fd0]/25 md:block" />
    </section>
  );
}
