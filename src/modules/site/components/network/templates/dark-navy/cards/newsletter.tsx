import Link from 'next/link';
import { Mail } from 'lucide-react';

import { cn } from '@/ui/cn';

export function DarkNavyNewsletter({ compact = false }: { readonly compact?: boolean }) {
  return (
    <section
      id="newsletter"
      aria-label="Berlangganan newsletter"
      className="relative overflow-hidden rounded-2xl bg-[#14294f] px-6 py-8 md:px-10"
      style={{ scrollMarginTop: '5rem' }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[#2f7bff]/20"
      />
      <div className={cn('grid items-center gap-6', compact ? '' : 'md:grid-cols-2')}>
        <div>
          <p className="m-0 flex items-center gap-2 font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-[#9aa9c4]">
            <Mail className="h-4 w-4 text-[#2f7bff]" aria-hidden="true" />
            Update setiap hari
          </p>
          <h2 className="m-0 mt-2 font-sans text-2xl font-extrabold leading-tight tracking-tight text-[#eaf0fb]">
            Dapatkan Berita Terkini di Email Anda
          </h2>
          <p className="m-0 mt-2 font-sans text-sm leading-relaxed text-[#9aa9c4]">
            Berlangganan newsletter kami dan jangan lewatkan informasi penting.
          </p>
        </div>
        <div>
          <p className="m-0 flex flex-col gap-2.5 sm:flex-row">
            <label htmlFor="dark-navy-newsletter-email" className="sr-only">
              Alamat email
            </label>
            <input
              id="dark-navy-newsletter-email"
              type="email"
              required
              placeholder="Masukkan alamat email"
              className="h-11 w-full flex-1 rounded-full border border-[#1b2c4f] bg-white px-4 font-sans text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#2f7bff] focus:outline-none"
            />
            {/* Pendaftaran dinonaktifkan sengaja hingga backend newsletter tersedia. */}
            <Link
              href=""
              aria-label="Berlangganan newsletter"
              className="inline-flex h-11 w-11 flex-none items-center justify-center rounded-full bg-[#2f7bff] font-sans text-sm font-bold text-white transition-colors hover:bg-[#1a5fd0]"
            >
              <span aria-hidden="true">→</span>
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
