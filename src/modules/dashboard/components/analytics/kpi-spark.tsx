'use client';

import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { Area, AreaChart } from 'recharts';

import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { TugasHarian } from '@/modules/dashboard/models';
import { WARNA_ANTRE, WARNA_GAGAL, WARNA_TERBIT } from '@/modules/dashboard/components/analytics/bantuan-grafik';

function deltaPersen(kini: number, lalu: number): string {
  if (lalu <= 0) return kini > 0 ? 'baru' : '—';
  const persen = Math.round(((kini - lalu) / lalu) * 100);
  return `${persen >= 0 ? '+' : ''}${persen}%`;
}

/**
 * Render satu KPI 7 hari dengan sparkline dan delta periode lalu.
 *
 * @param label - Nama metrik yang tampil.
 * @param kini - Deret 7 hari berjalan.
 * @param lalu - Deret 7 hari sebelumnya.
 * @param warna - Warna garis dan area sparkline.
 * @param ambil - Selektor nilai dari satu ember harian.
 * @returns Kartu KPI ringkas.
 */
function KartuSpark({
  label,
  kini,
  lalu,
  warna,
  ambil,
}: {
  readonly label: string;
  readonly kini: readonly TugasHarian[];
  readonly lalu: readonly TugasHarian[];
  readonly warna: string;
  readonly ambil: (titik: TugasHarian) => number;
}) {
  const totalKini = kini.reduce((jumlah, titik) => jumlah + ambil(titik), 0);
  const totalLalu = lalu.reduce((jumlah, titik) => jumlah + ambil(titik), 0);
  const delta = totalKini - totalLalu;
  const Ikon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const data = kini.map((titik, indeks) => ({ indeks, nilai: ambil(titik) }));
  return (
    <div className="h-full min-w-0 overflow-hidden rounded-lg border border-hairline bg-bg-raised p-5">
      <p className="m-0 font-sans text-xs font-medium text-paper-dim">{label}</p>
      <p className="m-0 mt-1 truncate font-mono text-2xl font-bold tabular-nums tracking-tight text-paper">
        {totalKini.toLocaleString('id-ID')}
      </p>
      <p className="m-0 mt-1 flex items-center gap-1.5 font-mono text-[11px] tabular-nums text-paper-faint">
        <Ikon className="h-3 w-3 text-brass" aria-hidden="true" />
        {deltaPersen(totalKini, totalLalu)} vs 7 hari lalu
      </p>
      <ChartContainer config={{ nilai: { label, color: warna } }} className="mt-3 h-12 w-full">
        <AreaChart data={data} margin={{ left: 0, right: 0, top: 2, bottom: 0 }}>
          <ChartTooltip
            content={
              <ChartTooltipContent
                hideLabel
                formatter={(nilai) =>
                  typeof nilai === 'number' ? nilai.toLocaleString('id-ID') : String(nilai ?? '')
                }
              />
            }
          />
          <Area type="monotone" dataKey="nilai" stroke={warna} strokeWidth={1.5} fill={warna} fillOpacity={0.22} dot={false} />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}

/**
 * Render tiga KPI 7 hari terakhir beserta sparkline-nya.
 *
 * @param series - Ember harian dari proyeksi analitik.
 * @returns Grid KPI sukses, tugas, dan gagal.
 */
export function KpiSparkline({ series }: { readonly series: readonly TugasHarian[] }) {
  const kini = series.slice(-7);
  const lalu = series.slice(-14, -7);
  return (
    <div className="grid h-full min-w-0 grid-cols-1 gap-4 min-[420px]:grid-cols-3">
      <KartuSpark label="Sukses 7 hari" kini={kini} lalu={lalu} warna={WARNA_TERBIT} ambil={(titik) => titik.diterbitkan} />
      <KartuSpark
        label="Tugas 7 hari"
        kini={kini}
        lalu={lalu}
        warna={WARNA_ANTRE}
        ambil={(titik) => titik.diterbitkan + titik.gagal + titik.antre}
      />
      <KartuSpark label="Gagal 7 hari" kini={kini} lalu={lalu} warna={WARNA_GAGAL} ambil={(titik) => titik.gagal} />
    </div>
  );
}
