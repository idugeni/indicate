import Link from 'next/link';
import Image from 'next/image';
import { SERVICE_NAME } from '@/ui/site/marketing-content';
import { currentYear } from '@/modules/site/current-year';
import { EditionDate } from './edition-date';

const LEDGER: readonly { readonly title: string; readonly detail: string }[] = Object.freeze([
  { title: 'Tulis sekali', detail: 'Satu naskah, satu antrean redaksi.' },
  { title: 'Terbit ke mana-mana', detail: 'Ratusan portal, domain, dan wilayah.' },
  { title: 'Teraudit penuh', detail: 'Setiap aksi tercatat, hanya-tambah.' },
]);

export async function BrandPanel() {
  const year = await currentYear();
  return (
    <div className="hidden border-r border-white/15 bg-[#1a2430] p-12 text-white md:flex md:flex-col md:justify-between">
      <div>
        <Link href="/" className="flex items-center gap-3 no-underline" aria-label="Indicate beranda">
          <span className="flex h-9 w-9 items-center justify-center rounded bg-[#f4f2ec]">
            <Image
              src="/brand/indicate-mark.svg"
              alt=""
              aria-hidden="true"
              width={28}
              height={28}
              className="h-7 w-7 object-contain"
            />
          </span>
          <span className="grid leading-none">
            <span className="font-sans text-xl font-semibold tracking-tight text-white">{SERVICE_NAME}</span>
            <span className="mt-1 font-mono text-[10px] tracking-[0.18em] text-white/60 uppercase">
              Publishing infrastructure
            </span>
          </span>
        </Link>
        <p className="m-0 mt-8 flex items-center justify-between gap-4 border-y border-white/15 py-3 font-mono text-[11px] tracking-wide text-white/70">
          <span>Jakarta</span>
          <EditionDate />
          <span>Edisi harian</span>
        </p>
      </div>

      <div>
        <p className="m-0 max-w-md font-serif text-5xl font-medium leading-[1.05] tracking-tight text-balance text-white">
          Satu sinyal untuk ratusan kanal berita.
        </p>
        <ol className="m-0 mt-10 grid list-none gap-0 p-0">
          {LEDGER.map((row, index) => (
            <li
              key={row.title}
              className="grid grid-cols-[2.5rem_minmax(0,1fr)] items-baseline gap-3 border-t border-white/15 py-4 last:border-b"
            >
              <span className="font-mono text-xs tabular-nums text-[#e8c87e]">
                {String(index + 1).padStart(2, '0')}
              </span>
              <div className="flex items-baseline justify-between gap-4">
                <p className="m-0 font-sans text-sm font-semibold text-white">{row.title}</p>
                <p className="m-0 text-right font-sans text-xs text-[#c7d2fe]">{row.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <p className="m-0 font-mono text-[11px] text-white/60">
        © {year} {SERVICE_NAME} · PT Sanca Phena Cakra
      </p>
    </div>
  );
}
