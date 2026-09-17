import Link from 'next/link';
import Image from 'next/image';
import { SERVICE_NAME } from '@/ui/site/marketing-content';
import { currentYear } from '@/modules/site/current-year';

const LEDGER: readonly { readonly title: string; readonly detail: string }[] = Object.freeze([
  { title: 'Tulis sekali', detail: 'Satu naskah, satu antrean redaksi.' },
  { title: 'Terbit ke mana-mana', detail: 'Ratusan portal, domain, dan wilayah.' },
  { title: 'Teraudit penuh', detail: 'Setiap aksi tercatat, hanya-tambah.' },
]);

export async function BrandPanel() {
  const year = await currentYear();
  return (
    <div className="hidden border-r border-white/15 bg-[#1a2430] p-12 text-white md:flex md:flex-col md:justify-between">
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
        <span className="font-sans text-xl font-semibold tracking-tight text-white">Indicate</span>
      </Link>

      <div>
        <p className="m-0 flex items-center gap-2.5 font-mono text-xs font-medium uppercase tracking-wider text-[#e8c87e]">
          <span aria-hidden="true" className="h-px w-8 flex-none bg-[#b88d3a]" />
          Ruang redaksi terpusat
        </p>
        <p className="m-0 mt-4 max-w-md font-sans text-3xl font-bold leading-tight tracking-tight text-balance text-white">
          Satu sinyal untuk ratusan kanal berita.
        </p>
        <ol className="m-0 mt-8 grid list-none gap-0 p-0">
          {LEDGER.map((row, index) => (
            <li
              key={row.title}
              className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3 border-t border-white/15 py-3.5 last:border-b"
            >
              <span className="font-mono text-xs tabular-nums text-[#e8c87e]">
                {String(index + 1).padStart(2, '0')}
              </span>
              <div>
                <p className="m-0 font-sans text-sm font-semibold text-white">{row.title}</p>
                <p className="m-0 mt-0.5 font-sans text-xs text-[#c7d2fe]">{row.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <p className="m-0 font-mono text-[11px] text-white/60">
        © {year} {SERVICE_NAME}. Hak cipta dilindungi undang-undang.
      </p>
    </div>
  );
}
