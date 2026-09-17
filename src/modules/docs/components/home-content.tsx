import Link from 'next/link';

import { DOCS_PAGES, DOCS_SECTIONS } from '@/modules/docs/navigation';
import { DocsPager } from '@/modules/docs/components/docs-pager';
import { DocCallout, DocTitle } from '@/modules/docs/components/docs-ui';

export function DocsHomeContent({ host }: { readonly host: string }) {
  return (
    <div>
      <DocTitle
        title="Dokumentasi Indicate"
        description="Referensi integrasi resmi platform sindikasi media multi-tenant: satu artikel kanonis diterbitkan ke banyak portal, masing-masing dengan domain, brand, SEO, dan status publikasi sendiri."
      />
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {[
          { href: '/quickstart', title: 'Mulai cepat', text: 'Kunci API pertama hingga publikasi tayang dalam lima langkah.' },
          { href: '/api-reference', title: 'Referensi API v1', text: 'Sembilan aksi supply pipeline dengan skema dan contoh.' },
          { href: '/webhooks', title: 'Webhook generik', text: 'Kontrak HMAC, freshness, dan replay-id idempoten.' },
          { href: '/telegram', title: 'Bot Telegram', text: 'Redaksi via chat: artikel, foto, publish, status.' },
        ].map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-2xl bg-white p-5 no-underline shadow-sm ring-1 ring-slate-200/60 transition-shadow hover:shadow-md"
          >
            <p className="m-0 font-sans text-base font-bold text-slate-900">{card.title}</p>
            <p className="m-0 mt-1 font-sans text-sm leading-relaxed text-slate-600">{card.text}</p>
          </Link>
        ))}
      </div>
      <DocCallout tone="info">
        Basis API: <span className="font-mono text-[13px]">https://api.indicate.web.id/api/v1/commands</span> — satu endpoint POST
        dengan aksi terdiskriminasi. Host halaman ini: <span className="font-mono text-[13px]">{host}</span>.
      </DocCallout>
      <h2 className="m-0 mb-3 mt-10 font-sans text-xl font-bold tracking-tight text-slate-900">Peta halaman</h2>
      {DOCS_SECTIONS.map((section) => (
        <div key={section} className="mt-4">
          <p className="m-0 font-sans text-[11px] font-bold uppercase tracking-wider text-slate-400">{section}</p>
          <ul className="m-0 mt-2 list-none space-y-2 p-0">
            {DOCS_PAGES.filter((page) => page.section === section && page.slug !== 'home').map((page) => (
              <li key={page.slug} className="m-0 rounded-xl bg-slate-50 p-4">
                <Link href={page.path} className="font-sans text-[15px] font-bold text-[#1a5fd0] hover:underline">
                  {page.title}
                </Link>
                <p className="m-0 mt-1 font-sans text-sm leading-relaxed text-slate-600">{page.description}</p>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <DocsPager slug="home" />
    </div>
  );
}
