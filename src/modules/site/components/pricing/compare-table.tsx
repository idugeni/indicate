import { Check, Minus } from 'lucide-react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type Cell = { readonly kind: 'check' } | { readonly kind: 'none' } | { readonly kind: 'text'; readonly text: string };

const HEADERS = Object.freeze(['Fitur', 'Starter', 'Growth', 'Pro', 'Enterprise']);

const ROWS: readonly { readonly feature: string; readonly cells: readonly [Cell, Cell, Cell, Cell] }[] = Object.freeze([
  {
    feature: 'Jumlah website berita',
    cells: [
      { kind: 'text', text: '10' },
      { kind: 'text', text: '50' },
      { kind: 'text', text: '100' },
      { kind: 'text', text: 'Sesuai kesepakatan' },
    ],
  },
  {
    feature: 'Harga per bulan',
    cells: [
      { kind: 'text', text: 'Rp149rb' },
      { kind: 'text', text: 'Rp299rb' },
      { kind: 'text', text: 'Rp550rb' },
      { kind: 'text', text: 'Kustom' },
    ],
  },
  {
    feature: 'Yang mengelola',
    cells: [
      { kind: 'text', text: 'Sendiri' },
      { kind: 'text', text: 'Sendiri' },
      { kind: 'text', text: '10 orang' },
      { kind: 'text', text: 'Tim Anda + kami' },
    ],
  },
  {
    feature: 'Bantuan',
    cells: [
      { kind: 'text', text: 'Email' },
      { kind: 'text', text: 'Prioritas' },
      { kind: 'text', text: 'Didampingi' },
      { kind: 'text', text: 'Kontak khusus' },
    ],
  },
  {
    feature: 'Bantuan pindahan sistem',
    cells: [{ kind: 'none' }, { kind: 'none' }, { kind: 'check' }, { kind: 'check' }],
  },
  {
    feature: 'Masa aktif & tenggang',
    cells: [
      { kind: 'text', text: '30 + 7 hari' },
      { kind: 'text', text: '30 + 7 hari' },
      { kind: 'text', text: '30 + 7 hari' },
      { kind: 'text', text: 'Sesuai kesepakatan' },
    ],
  },
]);

function CellValue({ cell }: { readonly cell: Cell }) {
  if (cell.kind === 'check') {
    return <Check className="mx-auto h-4 w-4 text-signal" aria-label="Termasuk" />;
  }
  if (cell.kind === 'none') {
    return <Minus className="mx-auto h-4 w-4 text-hairline-strong" aria-label="Tidak termasuk" />;
  }
  return <span className="font-sans text-xs text-paper-dim">{cell.text}</span>;
}

export function CompareTable() {
  return (
    <div
      role="region"
      aria-label="Perbandingan paket"
      tabIndex={0}
      className="overflow-x-auto border-y border-hairline"
    >
      <Table className="w-full min-w-[640px]">
        <TableHeader>
          <TableRow className="border-b border-hairline hover:bg-transparent">
            {HEADERS.map((header, index) => (
              <TableHead
                key={header}
                className={
                  index === 0
                    ? 'font-mono text-[11px] uppercase tracking-wider text-paper-faint'
                    : 'text-center font-mono text-xs font-semibold uppercase tracking-wider text-paper-dim'
                }
              >
                {header === 'Pro' ? (
                  <span className="border-b-2 border-brass pb-1 text-paper">{header}</span>
                ) : (
                  header
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {ROWS.map((row) => (
            <TableRow key={row.feature} className="border-b border-hairline/60 last:border-0 hover:bg-bg-raised/40">
              <TableCell className="font-sans text-xs font-medium text-paper">{row.feature}</TableCell>
              {row.cells.map((cell, index) => (
                <TableCell key={index} className="text-center">
                  <CellValue cell={cell} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
