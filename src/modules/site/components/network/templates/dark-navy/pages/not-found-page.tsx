import Link from 'next/link';

import type { NetworkSiteData } from '@/modules/delivery/models';
import { DarkNavyShell } from '@/modules/site/components/network/templates/dark-navy/chrome/shell';

export function DarkNavyNotFound({ site }: { readonly site: NetworkSiteData }) {
  return (
    <DarkNavyShell site={site} path="/404">
      <div className="mx-auto w-full max-w-xl px-4 py-14 text-center md:py-20">
        <p className="m-0 inline-block rounded-full bg-[#2f7bff] px-3.5 py-1.5 font-sans text-xs font-bold tracking-wide text-white">
          404
        </p>
        <h1 className="m-0 mt-4 font-sans text-3xl font-extrabold tracking-tight text-[#eaf0fb]">
          Halaman tidak ditemukan
        </h1>
        <p className="m-0 mx-auto mt-3 max-w-md font-sans text-sm leading-relaxed text-[#9aa9c4]">
          Konten yang Anda cari tidak tersedia di {site.settings.name} atau telah dipindahkan.
        </p>
        <p className="m-0 mt-6">
          <Link
            href="/"
            className="inline-flex h-11 items-center rounded-full bg-[#2f7bff] px-6 font-sans text-sm font-bold text-white transition-colors hover:bg-[#1a5fd0]"
          >
            Kembali ke beranda
          </Link>
        </p>
      </div>
    </DarkNavyShell>
  );
}
