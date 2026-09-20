import Link from 'next/link';
import { Lock } from 'lucide-react';

export function SoftBlueNewsletter() {
  return (
    <section id="newsletter" aria-label="Berlangganan newsletter" className="relative overflow-hidden rounded-2xl bg-[#dbeafe] px-6 py-8 md:px-10" style={{ scrollMarginTop: '5rem' }}>
      <div className="grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <p className="m-0 font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-[#2563eb]">
            Berlangganan Newsletter
          </p>
          <h2 className="m-0 mt-2 font-sans text-2xl font-extrabold leading-tight tracking-tight text-slate-900">
            Dapatkan Berita Terbaru Langsung ke Email Anda
          </h2>
          <p className="m-0 mt-2 font-sans text-sm leading-relaxed text-slate-600">
            Berita penting, dikurasi setiap hari. Tanpa spam, hanya informasi berkualitas.
          </p>
          <p className="m-0 mt-5 flex flex-col gap-2.5 sm:flex-row">
            <label htmlFor="soft-blue-newsletter-email" className="sr-only">
              Alamat email
            </label>
            <input
              id="soft-blue-newsletter-email"
              type="email"
              required
              placeholder="Masukkan alamat email"
              className="h-11 w-full flex-1 appearance-none rounded-full border border-slate-200 bg-white px-4 font-sans text-base text-slate-900 placeholder:text-slate-400 focus:border-[#2563eb] focus:outline-none sm:text-sm"
            />
            <Link
              href=""
              className="inline-flex h-11 flex-none items-center justify-center rounded-full bg-[#2563eb] px-6 font-sans text-sm font-bold text-white transition-colors hover:bg-[#1d4ed8]"
            >
              Berlangganan
            </Link>
          </p>
          <p className="m-0 mt-2.5 flex items-center gap-1.5 font-sans text-xs text-slate-600">
            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
            Kami menjaga privasi Anda. Tidak ada spam.
          </p>
        </div>
        <div aria-hidden="true" className="pointer-events-none justify-self-center sm:justify-self-end">
          <svg width="180" height="140" viewBox="0 0 180 140" fill="none" role="presentation" className="h-28 w-auto sm:h-35">
            <circle cx="28" cy="24" r="6" fill="#bfdbfe" opacity="0.7" />
            <circle cx="150" cy="18" r="4" fill="#93c5fd" opacity="0.6" />
            <circle cx="162" cy="60" r="7" fill="#bfdbfe" opacity="0.5" />
            <path d="M155 8 L172 2 L165 20 L160 14 L150 16 Z" fill="#2563eb" />
            <rect x="30" y="48" width="110" height="72" rx="10" fill="#ffffff" />
            <rect x="42" y="62" width="86" height="7" rx="3.5" fill="#dbeafe" />
            <rect x="42" y="75" width="64" height="7" rx="3.5" fill="#e6efff" />
            <rect x="42" y="88" width="76" height="7" rx="3.5" fill="#e6efff" />
            <path d="M22 78 L85 118 L148 78 L148 116 A10 10 0 0 1 138 126 L32 126 A10 10 0 0 1 22 116 Z" fill="#93c5fd" />
            <path d="M22 76 L85 116 L148 76 L143 70 L85 106 L27 70 Z" fill="#dbeafe" />
            <path d="M22 78 L60 106 L52 114 L22 90 Z" fill="#60a5fa" />
            <path d="M148 78 L110 106 L118 114 L148 90 Z" fill="#60a5fa" />
          </svg>
        </div>
      </div>
    </section>
  );
}
