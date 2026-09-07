import Link from 'next/link';
import Image from 'next/image';
import { currentYear } from '@/modules/site/current-year';

const LEDGER: readonly { readonly title: string; readonly detail: string }[] = Object.freeze([
  { title: 'Tulis sekali', detail: 'Satu naskah, satu antrean redaksi.' },
  { title: 'Terbit ke mana-mana', detail: 'Ratusan portal, domain, dan wilayah.' },
  { title: 'Teraudit penuh', detail: 'Setiap aksi tercatat, hanya-tambah.' },
]);

export async function BrandPanel() {
  const year = await currentYear();
  return (
    <div className="hidden border-r border-hairline bg-bg-raised/40 p-12 md:flex md:flex-col md:justify-between">
      <Link href="/" className="flex items-center gap-3 no-underline" aria-label="Indicate beranda">
        <Image
          src="/brand/logo.png"
          alt="Indicate"
          width={36}
          height={36}
          className="border border-hairline object-contain"
        />
        <span className="font-sans text-xl font-semibold tracking-tight text-paper">Indicate</span>
      </Link>

      <div>
        <p className="m-0 flex items-center gap-2.5 font-mono text-xs font-medium uppercase tracking-wider text-brass">
          <span aria-hidden="true" className="h-px w-8 flex-none bg-brass/70" />
          Ruang redaksi terpusat
        </p>
        <p className="m-0 mt-4 max-w-md font-sans text-3xl font-bold leading-tight tracking-tight text-balance text-paper">
          Satu sinyal untuk ratusan kanal berita.
        </p>
        <ol className="m-0 mt-8 grid list-none gap-0 p-0">
          {LEDGER.map((row, index) => (
            <li
              key={row.title}
              className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3 border-t border-hairline py-3.5 last:border-b"
            >
              <span className="font-mono text-xs tabular-nums text-brass">
                {String(index + 1).padStart(2, '0')}
              </span>
              <div>
                <p className="m-0 font-sans text-sm font-semibold text-paper">{row.title}</p>
                <p className="m-0 mt-0.5 font-sans text-xs text-paper-dim">{row.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <p className="m-0 font-mono text-[11px] text-paper-faint">
        © {year} Eliyanto Sarage · Indicate · Asia/Jakarta
      </p>
    </div>
  );
}
