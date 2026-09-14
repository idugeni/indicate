import Link from 'next/link';
import { BellRing, Send, ShieldCheck, Zap } from 'lucide-react';

const ASSURANCES = [
  { icon: Zap, text: 'Berita penting setiap hari' },
  { icon: ShieldCheck, text: 'Tanpa spam, privasi dijaga' },
  { icon: BellRing, text: 'Berhenti kapan saja' },
] as const;

export function CleanBlueNewsletter() {
  return (
    <section id="newsletter" aria-label="Berlangganan newsletter" className="relative overflow-hidden rounded-2xl bg-[#e8f0fe] px-6 py-8 md:px-10" style={{ scrollMarginTop: '5rem' }}>
      <div className="grid items-center gap-8 md:grid-cols-3">
        <div>
          <h2 className="m-0 font-sans text-2xl font-extrabold leading-tight tracking-tight text-slate-900">
            Dapatkan Berita Terbaru Langsung ke Email Anda
          </h2>
          <p className="m-0 mt-2 font-sans text-sm leading-relaxed text-slate-600">
            Berlangganan newsletter kami dan jangan lewatkan informasi penting setiap hari.
          </p>
        </div>
        <div>
          <p className="m-0 flex flex-col gap-2.5">
            <label htmlFor="clean-blue-newsletter-email" className="sr-only">
              Alamat email
            </label>
            <input
              id="clean-blue-newsletter-email"
              type="email"
              required
              placeholder="Masukkan alamat email"
              className="h-11 w-full rounded-full border border-slate-200 bg-white px-4 font-sans text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#1f6feb] focus:outline-none"
            />
            <Link
              href="/contact"
              className="inline-flex h-11 items-center justify-center rounded-full bg-[#1f6feb] px-6 font-sans text-sm font-bold text-white transition-colors hover:bg-[#1a5fd0]"
            >
              Berlangganan
            </Link>
          </p>
          <p className="m-0 mt-2.5 font-sans text-xs text-slate-500">
            Kami menghargai privasi Anda. Tidak ada spam, hanya berita penting.
          </p>
        </div>
        <ul className="m-0 list-none space-y-3 p-0">
          {ASSURANCES.map((item) => (
            <li key={item.text} className="flex items-center gap-3 rounded-xl bg-white/70 px-4 py-3 ring-1 ring-white">
              <span aria-hidden="true" className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[#1f6feb]/10 text-[#1f6feb]">
                <item.icon className="h-4 w-4" />
              </span>
              <span className="font-sans text-sm font-semibold text-slate-800">{item.text}</span>
            </li>
          ))}
        </ul>
      </div>
      <Send aria-hidden="true" className="pointer-events-none absolute -right-4 -top-4 hidden h-24 w-24 rotate-12 text-[#1f6feb]/15 md:block" />
    </section>
  );
}
