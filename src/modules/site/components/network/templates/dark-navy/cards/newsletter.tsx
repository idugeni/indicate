import { ArrowRight, Mail } from 'lucide-react';
import { TemplateButton, TemplateInput } from '@/modules/site/components/network/ui/field';

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
        <div className="min-w-0">
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <label htmlFor="dark-navy-newsletter-email" className="sr-only">
              Alamat email
            </label>
            <TemplateInput
              id="dark-navy-newsletter-email"
              type="email"
              required
              placeholder="Masukkan alamat email"
              className="h-11 w-full min-w-0 appearance-none rounded-full px-4 font-sans text-base focus:outline-none sm:flex-1 sm:text-sm"
            />
            {/* Pendaftaran dinonaktifkan sengaja hingga backend newsletter tersedia. */}
            <TemplateButton
              type="button"
              aria-label="Berlangganan newsletter"
              className="h-11 w-full flex-none rounded-full px-6 sm:w-11 sm:px-0"
            >
              <span className="sm:hidden">Berlangganan</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </TemplateButton>
          </div>
        </div>
      </div>
    </section>
  );
}
