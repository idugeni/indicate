'use client';

import { Sankey, Tooltip } from 'recharts';
import type { SankeyNode } from 'recharts/types/util/types';

import { ChartContainer } from '@/components/ui/chart';
import type { ArusPenerbit } from '@/modules/dashboard/models';
import { potongLabel, warnaKategori } from '@/modules/dashboard/components/analytics/bantuan-grafik';
import { EmptyState } from '@/modules/dashboard/components/empty-state';

const BATAS_SIMPUL = 6;

interface Tautan {
  readonly source: number;
  readonly target: number;
  readonly value: number;
}

function jumlahPer(arus: readonly ArusPenerbit[], ambil: (baris: ArusPenerbit) => string): Map<string, number> {
  const total = new Map<string, number>();
  for (const baris of arus) {
    const kunci = ambil(baris);
    total.set(kunci, (total.get(kunci) ?? 0) + baris.jumlah);
  }
  return total;
}

function teratas(total: Map<string, number>): string[] {
  return [...total].sort((kiri, kanan) => kanan[1] - kiri[1]).slice(0, BATAS_SIMPUL).map(([kunci]) => kunci);
}

function sisa(total: Map<string, number>, atas: readonly string[]): number {
  return [...total].filter(([kunci]) => !atas.includes(kunci)).reduce((jumlah, [, nilai]) => jumlah + nilai, 0);
}

function bangun(arus: readonly ArusPenerbit[]): { nodes: { name: string }[]; links: Tautan[] } {
  const totalPenerbit = jumlahPer(arus, (baris) => baris.penerbit);
  const totalSitus = jumlahPer(arus, (baris) => baris.situs);
  const penerbitTop = teratas(totalPenerbit);
  const situsTop = teratas(totalSitus);
  const penerbitLain = sisa(totalPenerbit, penerbitTop) > 0 ? ['Penerbit lain'] : [];
  const situsLain = sisa(totalSitus, situsTop) > 0 ? ['Situs lain'] : [];
  const hasil = [...new Set(arus.map((baris) => baris.hasil))].sort();
  const namaPenerbit = (nilai: string): string => (penerbitTop.includes(nilai) ? nilai : 'Penerbit lain');
  const namaSitus = (nilai: string): string => (situsTop.includes(nilai) ? nilai : 'Situs lain');
  const nodes = [...penerbitTop, ...penerbitLain, ...situsTop, ...situsLain, ...hasil].map((name) => ({ name }));
  const indeks = new Map(nodes.map((simpul, posisi) => [simpul.name, posisi]));
  const tautan = new Map<string, number>();
  const tambah = (dari: string, ke: string, nilai: number): void => {
    const awal = indeks.get(dari) ?? 0;
    const akhir = indeks.get(ke) ?? 0;
    const kunci = `${awal}:${akhir}`;
    tautan.set(kunci, (tautan.get(kunci) ?? 0) + nilai);
  };
  for (const baris of arus) {
    tambah(namaPenerbit(baris.penerbit), namaSitus(baris.situs), baris.jumlah);
    tambah(namaSitus(baris.situs), baris.hasil, baris.jumlah);
  }
  const links = [...tautan]
    .filter(([, value]) => value > 0)
    .map(([kunci, value]) => {
      const [source, target] = kunci.split(':').map(Number);
      return { source: source ?? 0, target: target ?? 0, value };
    });
  return { nodes, links };
}

function Simpul(props: { readonly x?: number | undefined; readonly y?: number | undefined; readonly width?: number | undefined; readonly height?: number | undefined; readonly index?: number | undefined; readonly payload?: SankeyNode | undefined }) {
  const { x = 0, y = 0, width = 0, height = 0, index = 0, payload } = props;
  const depth = payload?.depth ?? 1;
  const nama = payload?.name ?? '';
  const warna = warnaKategori(index);
  const kanan = depth === 2;
  return (
    <g>
      <rect x={x} y={y} width={width} height={Math.max(height, 2)} fill={warna} fillOpacity={0.9} rx={2} />
      <text
        x={kanan ? x - 6 : x + width + 6}
        y={y + height / 2}
        textAnchor={kanan ? 'end' : 'start'}
        dominantBaseline="central"
        fontSize={11}
        fill="#9fa6b8"
      >
        {potongLabel(nama, 16)}
      </text>
    </g>
  );
}

function IsiSankey({ active, payload }: { readonly active?: boolean; readonly payload?: readonly { readonly value?: number | string }[] }) {
  if (active !== true || payload === undefined || payload.length === 0) return null;
  const nilai = payload[0]?.value;
  return (
    <div className="rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
      <span className="font-mono font-medium tabular-nums text-foreground">
        {typeof nilai === 'number' ? nilai.toLocaleString('id-ID') : String(nilai ?? '')}
      </span>
    </div>
  );
}

/**
 * Render arus penerbit → situs → hasil sebagai diagram Sankey.
 *
 * @param arus - Sisi arus dari proyeksi analitik; simpul dibatasi 6 teratas per tingkat.
 * @returns Kartu Sankey tiga tingkat.
 */
export function AlurSankey({ arus }: { readonly arus: readonly ArusPenerbit[] }) {
  if (arus.length === 0) {
    return (
      <section
        aria-label="Alur penerbit"
        className="flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-hairline bg-bg-raised p-5 sm:p-6"
      >
        <h2 className="m-0 font-sans text-sm font-semibold tracking-tight text-paper">
          Alur penerbit
        </h2>
        <EmptyState title="Belum ada arus penerbit." description="Data akan tampil di sini setelah tersedia." />
      </section>
    );
  }
  const { nodes, links } = bangun(arus);
  return (
    <section
      aria-label="Alur penerbit"
      className="flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-hairline bg-bg-raised p-5 sm:p-6"
    >
      <h2 className="m-0 font-sans text-sm font-semibold tracking-tight text-paper">
        Alur penerbit
      </h2>
      <p className="m-0 mt-0.5 font-sans text-xs text-paper-faint">
        Artikel mengalir dari penerbit ke situs hingga hasil
      </p>
      <ChartContainer config={{}} className="mt-4 h-80 w-full">
        <Sankey
          data={{ nodes, links }}
          dataKey="value"
          node={<Simpul />}
          nodeWidth={10}
          nodePadding={12}
          margin={{ top: 8, right: 24, bottom: 8, left: 24 }}
          link={{ stroke: '#2a3348', strokeOpacity: 0.9, fill: '#2a3348', fillOpacity: 0.55 }}
          sort={false}
        >
          <Tooltip content={<IsiSankey />} />
        </Sankey>
      </ChartContainer>
    </section>
  );
}
