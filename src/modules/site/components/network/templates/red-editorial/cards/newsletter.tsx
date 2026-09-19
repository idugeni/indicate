import Link from 'next/link';
import { ArrowRight, Mail } from 'lucide-react';

export function RedEditorialNewsletter() {
  return (
    <section id="newsletter" aria-label="Berlangganan newsletter" className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#5f0f0f] via-[#7f1d1d] to-[#991b1b] px-6 py-8 md:px-10" style={{ scrollMarginTop: '5rem' }}>
      <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-white/10" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 right-40 h-56 w-56 rounded-full bg-white/5" />
      <div className="relative grid items-center gap-6 lg:grid-cols-2">
        <div className="flex items-start gap-4">
          <span aria-hidden="true" className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-[#b91c1c] text-white shadow-md ring-1 ring-white/25">
            <Mail className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="m-0 text-[11px] font-bold uppercase tracking-[0.2em] text-white/70">
              Berlangganan newsletter
            </p>
            <h2 className="m-0 mt-1 font-serif text-2xl font-bold leading-tight text-white">
              Dapatkan Berita Terbaru Langsung ke Email Anda
            </h2>
            <p className="m-0 mt-1.5 text-sm leading-relaxed text-white/75">
              Berita penting, dikurasi setiap hari. Tanpa spam, hanya informasi berkualitas.
            </p>
          </div>
        </div>
        <div>
          <p className="m-0 flex flex-col gap-2.5 sm:flex-row">
            <label htmlFor="red-editorial-newsletter-email" className="sr-only">
              Alamat email
            </label>
            <input
              id="red-editorial-newsletter-email"
              type="email"
              required
              placeholder="Masukkan alamat email"
              className="h-11 w-full flex-1 rounded-full border border-white/20 bg-white px-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-white focus:outline-none"
            />
            <Link
              href=""
              className="inline-flex h-11 flex-none items-center justify-center gap-1.5 rounded-full bg-[#b91c1c] px-6 text-sm font-bold text-white ring-1 ring-white/25 transition-colors hover:bg-[#dc2626]"
            >
              Berlangganan
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
