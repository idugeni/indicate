'use client';

import { useId, useState } from 'react';
import { Area, AreaChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';

import { Button } from '@/components/ui/button';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { TugasHarian } from '@/modules/dashboard/models';
import { WARNA_ANTRE, WARNA_GAGAL, WARNA_TERBIT, labelHari } from '@/modules/dashboard/components/analytics/bantuan-grafik';

const RENTANG = [7, 30, 90] as const;

interface BarisDeret {
  readonly hari: string;
  readonly label: string;
  readonly diterbitkan: number;
  readonly gagal: number;
  readonly antre: number;
}

function siapkan(series: readonly TugasHarian[], rentang: number): BarisDeret[] {
  return series.slice(-rentang).map((titik) => ({
    hari: titik.hari,
    label: labelHari(titik.hari),
    diterbitkan: titik.diterbitkan,
    gagal: titik.gagal,
    antre: titik.antre,
  }));
}

function LabelKosong() {
  return <p className="m-auto px-2 py-6 text-center font-sans text-[13px] text-paper-dim">Belum ada data deret waktu.</p>;
}

/**
 * Render tren publikasi sebagai area bertumpuk interaktif.
 *
 * @param series - Ember harian dari proyeksi analitik (maks 90 hari).
 * @returns Kartu area dengan pengalih rentang 7/30/90 hari.
 */
export function TrenPublikasi({ series }: { readonly series: readonly TugasHarian[] }) {
  const [rentang, setRentang] = useState<number>(30);
  const grad = useId().replace(/:/g, '');
  const data = siapkan(series, rentang);
  return (
    <section
      aria-label="Tren publikasi"
      className="flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-hairline bg-bg-raised p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="m-0 font-sans text-sm font-semibold tracking-tight text-paper">
            Tren publikasi
          </h2>
          <p className="m-0 mt-0.5 font-sans text-xs text-paper-faint">
            Tugas diterbitkan, gagal, dan antre per hari
          </p>
        </div>
        <div role="group" aria-label="Rentang tren" className="flex items-center gap-1.5">
          {RENTANG.map((pilihan) => (
            <Button
              key={pilihan}
              type="button"
              variant="outline"
              size="xs"
              onClick={() => setRentang(pilihan)}
              aria-pressed={rentang === pilihan}
              className={`font-mono text-[11px] tabular-nums ${
                rentang === pilihan
                  ? 'border-brass/60 bg-bg-raised-2 text-paper'
                  : 'border-hairline text-paper-faint hover:border-hairline-strong hover:text-paper'
              }`}
            >
              {pilihan}h
            </Button>
          ))}
        </div>
      </div>
      {data.length === 0 ? (
        <LabelKosong />
      ) : (
        <ChartContainer
          config={{
            diterbitkan: { label: 'Diterbitkan', color: WARNA_TERBIT },
            gagal: { label: 'Gagal', color: WARNA_GAGAL },
            antre: { label: 'Antre', color: WARNA_ANTRE },
          }}
          className="mt-4 h-64 w-full"
        >
          <AreaChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
            <defs>
              <linearGradient id={`${grad}-terbit`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={WARNA_TERBIT} stopOpacity={0.45} />
                <stop offset="100%" stopColor={WARNA_TERBIT} stopOpacity={0.04} />
              </linearGradient>
              <linearGradient id={`${grad}-gagal`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={WARNA_GAGAL} stopOpacity={0.4} />
                <stop offset="100%" stopColor={WARNA_GAGAL} stopOpacity={0.04} />
              </linearGradient>
              <linearGradient id={`${grad}-antre`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={WARNA_ANTRE} stopOpacity={0.4} />
                <stop offset="100%" stopColor={WARNA_ANTRE} stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={28} tick={{ fontSize: 11 }} />
            <YAxis width={36} tickLine={false} axisLine={false} allowDecimals={false} tick={{ fontSize: 11 }} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(_, payload) => {
                    const pertama = payload?.[0]?.payload as BarisDeret | undefined;
                    return pertama === undefined ? null : labelHari(pertama.hari);
                  }}
                  formatter={(nilai) =>
                    typeof nilai === 'number' ? nilai.toLocaleString('id-ID') : String(nilai ?? '')
                  }
                />
              }
            />
            <Area type="monotone" dataKey="diterbitkan" stackId="tren" stroke={WARNA_TERBIT} strokeWidth={2} fill={`url(#${grad}-terbit)`} />
            <Area type="monotone" dataKey="gagal" stackId="tren" stroke={WARNA_GAGAL} strokeWidth={2} fill={`url(#${grad}-gagal)`} />
            <Area type="monotone" dataKey="antre" stackId="tren" stroke={WARNA_ANTRE} strokeWidth={2} fill={`url(#${grad}-antre)`} />
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      )}
    </section>
  );
}

/**
 * Render perbandingan tiga metrik harian sebagai garis.
 *
 * @param series - Ember harian dari proyeksi analitik (maks 90 hari).
 * @returns Kartu garis multi-metrik 30 hari terakhir.
 */
export function PerbandinganMetrik({ series }: { readonly series: readonly TugasHarian[] }) {
  const data = siapkan(series, 30);
  return (
    <section
      aria-label="Perbandingan metrik"
      className="flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-hairline bg-bg-raised p-5 sm:p-6"
    >
      <h2 className="m-0 font-sans text-sm font-semibold tracking-tight text-paper">
        Perbandingan metrik
      </h2>
      <p className="m-0 mt-0.5 font-sans text-xs text-paper-faint">
        Tiga metrik harian, 30 hari terakhir
      </p>
      {data.length === 0 ? (
        <LabelKosong />
      ) : (
        <ChartContainer
          config={{
            diterbitkan: { label: 'Diterbitkan', color: WARNA_TERBIT },
            gagal: { label: 'Gagal', color: WARNA_GAGAL },
            antre: { label: 'Antre', color: WARNA_ANTRE },
          }}
          className="mt-4 h-64 w-full"
        >
          <LineChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={28} tick={{ fontSize: 11 }} />
            <YAxis width={36} tickLine={false} axisLine={false} allowDecimals={false} tick={{ fontSize: 11 }} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(_, payload) => {
                    const pertama = payload?.[0]?.payload as BarisDeret | undefined;
                    return pertama === undefined ? null : labelHari(pertama.hari);
                  }}
                  formatter={(nilai) =>
                    typeof nilai === 'number' ? nilai.toLocaleString('id-ID') : String(nilai ?? '')
                  }
                />
              }
            />
            <Line type="monotone" dataKey="diterbitkan" stroke={WARNA_TERBIT} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="gagal" stroke={WARNA_GAGAL} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="antre" stroke={WARNA_ANTRE} strokeWidth={2} dot={false} />
            <ChartLegend content={<ChartLegendContent />} />
          </LineChart>
        </ChartContainer>
      )}
    </section>
  );
}
