'use client';

import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Scatter, ScatterChart, XAxis, YAxis, ZAxis } from 'recharts';

import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { AnalyticsProjection, ViewsHarian, ViewsPoint } from '@/modules/dashboard/models';
import { labelHari, potongLabel, warnaKategori } from '@/modules/dashboard/components/analytics/bantuan-grafik';
import { KalenderPanass, PetaPanas } from '@/modules/dashboard/components/analytics/panas';
import { KpiSparkline } from '@/modules/dashboard/components/analytics/kpi-spark';
import { LiniMasa } from '@/modules/dashboard/components/analytics/lini-masa';
import { MatriksStatus } from '@/modules/dashboard/components/analytics/matriks';
import { PetaPohon } from '@/modules/dashboard/components/analytics/pohon';
import { AlurSankey } from '@/modules/dashboard/components/analytics/sankey';
import { FunnelKonversi, PeringkatTeratas } from '@/modules/dashboard/components/analytics/summary-insights';
import { SummaryCharts, TingkatKeberhasilan } from '@/modules/dashboard/components/analytics/summary-charts';
import { TrenPublikasi } from '@/modules/dashboard/components/analytics/tren';

const RENTANG = [7, 30, 90] as const;
const BATAS_SITUS = 10;
const BATAS_GELEMBUNG = 20;

const WARNA_TUMPUK: Record<string, string> = {
  published: '#5fcbb0',
  failed: '#d9705f',
  queued: '#d8a94e',
  processing: '#6c93c9',
  retrying: '#cc9a44',
  unpublished: '#8b93a7',
};

function siapkanGaris(series: readonly ViewsHarian[], rentang: number): readonly { hari: string; label: string; tayangan: number }[] {
  return series.slice(-rentang).map((titik) => ({ hari: titik.hari, label: labelHari(titik.hari), tayangan: titik.views }));
}

/**
 * Render tren tayangan harian sebagai garis.
 *
 * @param series - Ember harian tayangan dari proyeksi analitik (maks 90 hari).
 * @returns Kartu garis tayangan dengan pengalih rentang 7/30/90 hari.
 */
export function GarisTayangan({ series }: { readonly series: readonly ViewsHarian[] }) {
  const [rentang, setRentang] = useState<number>(30);
  const data = siapkanGaris(series, rentang);
  const total = series.reduce((jumlah, titik) => jumlah + titik.views, 0);
  return (
    <section
      aria-label="Tren tayangan"
      className="flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-hairline bg-bg-raised p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="m-0 font-sans text-sm font-semibold tracking-tight text-paper">
            Tren tayangan
          </h2>
          <p className="m-0 mt-0.5 font-mono text-[11px] tabular-nums text-paper-faint">
            {total.toLocaleString('id-ID')} tayangan dalam rentang
          </p>
        </div>
        <div role="group" aria-label="Rentang tayangan" className="flex items-center gap-1.5">
          {RENTANG.map((pilihan) => (
            <button
              key={pilihan}
              type="button"
              onClick={() => setRentang(pilihan)}
              aria-pressed={rentang === pilihan}
              className={`inline-flex h-7 items-center rounded border px-2.5 font-mono text-[11px] tabular-nums transition-colors duration-180 focus:outline-none ${
                rentang === pilihan
                  ? 'border-brass/60 bg-bg-raised-2 text-paper'
                  : 'border-hairline text-paper-faint hover:border-hairline-strong hover:text-paper'
              }`}
            >
              {pilihan}h
            </button>
          ))}
        </div>
      </div>
      {data.length === 0 ? (
        <p className="m-auto px-2 py-6 text-center font-sans text-[13px] text-paper-dim">Belum ada data tayangan.</p>
      ) : (
        <ChartContainer
          config={{ tayangan: { label: 'Tayangan', color: '#cc9a44' } }}
          className="mt-4 h-64 w-full"
        >
          <LineChart data={[...data]} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={28} tick={{ fontSize: 11 }} />
            <YAxis width={44} tickLine={false} axisLine={false} allowDecimals={false} tick={{ fontSize: 11 }} tickFormatter={(nilai: number) => (nilai >= 1000 ? `${Math.round(nilai / 1000)}rb` : String(nilai))} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(_, payload) => {
                    const pertama = payload?.[0]?.payload as { hari?: string } | undefined;
                    return pertama?.hari === undefined ? null : labelHari(pertama.hari);
                  }}
                  formatter={(nilai) =>
                    typeof nilai === 'number' ? nilai.toLocaleString('id-ID') : String(nilai ?? '')
                  }
                />
              }
            />
            <Line type="monotone" dataKey="tayangan" stroke="#cc9a44" strokeWidth={2} dot={false} />
            <ChartLegend content={<ChartLegendContent />} />
          </LineChart>
        </ChartContainer>
      )}
    </section>
  );
}

/**
 * Render peringkat situs berdasar tayangan sebagai batang horizontal.
 *
 * @param baris - Titik tayangan per situs dari proyeksi analitik.
 * @param label - Pemeta ID situs ke nama tampilan.
 * @returns Kartu batang 10 situs teratas.
 */
export function BarTayanganSitus({ baris, label }: { readonly baris: readonly ViewsPoint[]; readonly label: (id: string) => string }) {
  const data = [...baris]
    .sort((kiri, kanan) => kanan.views - kiri.views)
    .slice(0, BATAS_SITUS)
    .map((titik) => ({ nama: label(titik.key), tayangan: titik.views, situs: titik.count }));
  const total = baris.reduce((jumlah, titik) => jumlah + titik.views, 0);
  return (
    <section
      aria-label="Tayangan per situs"
      className="flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-hairline bg-bg-raised p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="m-0 font-sans text-sm font-semibold tracking-tight text-paper">
            Tayangan per situs
          </h2>
          <p className="m-0 mt-0.5 font-sans text-xs text-paper-faint">
            10 situs teratas berdasar view_count
          </p>
        </div>
        <p className="m-0 font-mono text-[11px] tabular-nums text-paper-faint">
          {total.toLocaleString('id-ID')} total
        </p>
      </div>
      {data.length === 0 ? (
        <p className="m-auto px-2 py-6 text-center font-sans text-[13px] text-paper-dim">Belum ada data tayangan situs.</p>
      ) : (
        <ChartContainer config={{ tayangan: { label: 'Tayangan', color: '#6c93c9' } }} className="mt-4 max-h-64 w-full">
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 12 }}>
            <CartesianGrid horizontal={false} />
            <YAxis
              dataKey="nama"
              type="category"
              width={132}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
              tickFormatter={(nilai: string) => potongLabel(nilai)}
            />
            <XAxis type="number" hide />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(nilai) =>
                    typeof nilai === 'number' ? nilai.toLocaleString('id-ID') : String(nilai ?? '')
                  }
                />
              }
            />
            <Bar dataKey="tayangan" radius={[2, 2, 2, 2]}>
              {data.map((titik, peringkat) => (
                <Cell key={titik.nama} fill={warnaKategori(peringkat)} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      )}
    </section>
  );
}

/**
 * Render komposisi penyaluran per situs sebagai batang bertumpuk kategorikal.
 *
 * @param hasil - Titik `situs:status` dari proyeksi analitik.
 * @param label - Pemeta ID situs ke nama tampilan.
 * @returns Kartu batang 8 situs teratas dengan tumpukan status dinamis.
 */
export function TumpukanSitus({ hasil, label }: { readonly hasil: readonly { readonly key: string; readonly count: number }[]; readonly label: (id: string) => string }) {
  const matriks = new Map<string, Map<string, number>>();
  for (const titik of hasil) {
    const pisah = titik.key.indexOf(':');
    if (pisah < 0) continue;
    const situs = titik.key.slice(0, pisah);
    const status = titik.key.slice(pisah + 1);
    const baris = matriks.get(situs) ?? new Map<string, number>();
    baris.set(status, (baris.get(status) ?? 0) + titik.count);
    matriks.set(situs, baris);
  }
  const situsTop = [...matriks]
    .map(([nama, baris]) => ({ nama, total: [...baris.values()].reduce((a, b) => a + b, 0) }))
    .sort((kiri, kanan) => kanan.total - kiri.total)
    .slice(0, 8);
  const statusList = [...new Set([...matriks.values()].flatMap((baris) => [...baris.keys()]))].sort();
  const data = situsTop.map(({ nama }) => ({
    situs: potongLabel(label(nama), 14),
    ...Object.fromEntries(statusList.map((status) => [status, matriks.get(nama)?.get(status) ?? 0])),
  }));
  return (
    <section
      aria-label="Komposisi situs"
      className="flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-hairline bg-bg-raised p-5 sm:p-6"
    >
      <h2 className="m-0 font-sans text-sm font-semibold tracking-tight text-paper">
        Komposisi situs
      </h2>
      <p className="m-0 mt-0.5 font-sans text-xs text-paper-faint">
        Penyaluran 8 situs teratas per status
      </p>
      {data.length === 0 ? (
        <p className="m-auto px-2 py-6 text-center font-sans text-[13px] text-paper-dim">Belum ada hasil situs.</p>
      ) : (
        <ChartContainer
          config={Object.fromEntries(statusList.map((status) => [status, { label: status, color: WARNA_TUMPUK[status] ?? '#8b93a7' }]))}
          className="mt-4 h-64 w-full"
        >
          <BarChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 0 }} barCategoryGap="28%">
            <CartesianGrid vertical={false} />
            <XAxis dataKey="situs" tickLine={false} axisLine={false} minTickGap={12} tick={{ fontSize: 11 }} />
            <YAxis width={36} tickLine={false} axisLine={false} allowDecimals={false} tick={{ fontSize: 11 }} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(nilai) =>
                    typeof nilai === 'number' ? nilai.toLocaleString('id-ID') : String(nilai ?? '')
                  }
                />
              }
            />
            {statusList.map((status, indeks) => (
              <Bar key={status} dataKey={status} stackId="situs" fill={`var(--color-${status})`} radius={indeks === statusList.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]} />
            ))}
            <ChartLegend content={<ChartLegendContent />} />
          </BarChart>
        </ChartContainer>
      )}
    </section>
  );
}

interface GelembungTayangan {
  readonly nama: string;
  readonly volume: number;
  readonly rata: number;
  readonly total: number;
}

/**
 * Render volume vs rata-rata tayangan per situs sebagai gelembung.
 *
 * @param baris - Titik tayangan per situs dari proyeksi analitik.
 * @param label - Pemeta ID situs ke nama tampilan.
 * @returns Kartu sebar: sumbu-x volume, sumbu-y rata-rata tayangan, ukuran gelembung total.
 */
export function GelembungTayangan({ baris, label }: { readonly baris: readonly ViewsPoint[]; readonly label: (id: string) => string }) {
  const data: GelembungTayangan[] = [...baris]
    .sort((kiri, kanan) => kanan.views - kiri.views)
    .slice(0, BATAS_GELEMBUNG)
    .map((titik) => ({
      nama: label(titik.key),
      volume: titik.count,
      rata: titik.count > 0 ? Math.round(titik.views / titik.count) : 0,
      total: titik.views,
    }));
  return (
    <section
      aria-label="Gelembung tayangan"
      className="flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-hairline bg-bg-raised p-5 sm:p-6"
    >
      <h2 className="m-0 font-sans text-sm font-semibold tracking-tight text-paper">
        Gelembung tayangan
      </h2>
      <p className="m-0 mt-0.5 font-sans text-xs text-paper-faint">
        Volume vs rata-rata tayangan per situs
      </p>
      {data.length === 0 ? (
        <p className="m-auto px-2 py-6 text-center font-sans text-[13px] text-paper-dim">Belum ada data sebar tayangan.</p>
      ) : (
        <ChartContainer config={{ total: { label: 'Tayangan', color: '#5fcbb0' } }} className="mt-4 h-64 w-full">
          <ScatterChart margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
            <XAxis
              type="number"
              dataKey="volume"
              name="Volume"
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              tick={{ fontSize: 11 }}
              label={{ value: 'volume', position: 'insideBottomRight', fontSize: 10, fill: '#8b93a7' }}
            />
            <YAxis
              type="number"
              dataKey="rata"
              name="Rata-rata"
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              tick={{ fontSize: 11 }}
              label={{ value: 'rata tayangan', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#8b93a7' }}
            />
            <ZAxis type="number" dataKey="total" range={[24, 220]} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(_, payload) => {
                    const pertama = payload?.[0]?.payload as GelembungTayangan | undefined;
                    return pertama === undefined ? null : potongLabel(pertama.nama, 32);
                  }}
                  formatter={(nilai) =>
                    typeof nilai === 'number' ? nilai.toLocaleString('id-ID') : String(nilai ?? '')
                  }
                />
              }
            />
            <Scatter data={data} fill="#5fcbb0" fillOpacity={0.75} />
          </ScatterChart>
        </ChartContainer>
      )}
    </section>
  );
}

/**
 * Render dasbor utama sebagai bento enterprise 15 visual.
 *
 * @param jobs - Cacah tugas penerbitan per status untuk donat antrean.
 * @param berhasil - Jumlah hasil situs sukses untuk corong dan radial.
 * @param gagal - Jumlah hasil situs gagal untuk corong dan radial.
 * @param aktif - Jumlah artikel aktif untuk donat dan corong.
 * @param arsip - Jumlah artikel arsip untuk donat artikel.
 * @param analytics - Proyeksi analitik tenant; null saat endpoint telemetri belum menjawab.
 * @returns Grid bento 12 kolom: KPI, donat, corong, tren, komposisi, panas, alur, dan distribusi.
 */
export function BentoUtama({
  jobs,
  berhasil,
  gagal,
  aktif,
  arsip,
  analytics,
}: {
  readonly jobs: Readonly<Record<string, number>>;
  readonly berhasil: number;
  readonly gagal: number;
  readonly aktif: number;
  readonly arsip: number;
  readonly analytics: AnalyticsProjection | null;
}) {
  const deret = analytics?.penyaluranHarian ?? analytics?.tugasHarian ?? [];
  const tayangan = analytics?.viewsHarian ?? [];
  const hasil = analytics?.outcomesBySiteAndState ?? [];
  const situs = (id: string): string => analytics?.siteLabels?.[id] ?? potongLabel(id, 18);
  const hasilBerlabel = hasil.map((titik) => {
    const pisah = titik.key.indexOf(':');
    if (pisah < 0) return titik;
    return { key: `${situs(titik.key.slice(0, pisah))}:${titik.key.slice(pisah + 1)}`, count: titik.count };
  });
  const berlabel = (baris: readonly { readonly key: string; readonly count: number }[] | undefined, peta: Readonly<Record<string, string>> | undefined) =>
    (baris ?? []).map((titik) => ({ key: peta?.[titik.key] ?? potongLabel(titik.key, 24), count: titik.count }));
  const arusBerlabel = (analytics?.arusPenerbit ?? []).map((arus) => ({
    penerbit: analytics?.publisherLabels?.[arus.penerbit] ?? potongLabel(arus.penerbit, 16),
    situs: situs(arus.situs),
    hasil: arus.hasil,
    jumlah: arus.jumlah,
  }));
  const pohonArtikel = (analytics?.viewsByArticle ?? []).map((titik) => ({
    key: analytics?.articleLabels?.[titik.key] ?? potongLabel(titik.key, 28),
    count: titik.views,
  }));
  const tugasCorong = analytics?.totalPenyaluran ?? (berhasil + gagal);
  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 min-[420px]:grid-cols-6 lg:grid-cols-12 col-span-full">
      <div className="min-w-0 col-span-full">
        <KpiSparkline series={deret} />
      </div>
      <SummaryCharts jobs={jobs} berhasil={berhasil} gagal={gagal} aktif={aktif} arsip={arsip} />
      <FunnelKonversi aktif={aktif} tugas={tugasCorong} sukses={berhasil} className="min-[420px]:col-span-6 lg:col-span-8" />
      <TingkatKeberhasilan berhasil={berhasil} gagal={gagal} className="min-[420px]:col-span-6 lg:col-span-4" />
      <div className="min-w-0 min-[420px]:col-span-6 lg:col-span-7">
        <TrenPublikasi series={deret} />
      </div>
      <div className="min-w-0 min-[420px]:col-span-6 lg:col-span-5">
        <GarisTayangan series={tayangan} />
      </div>
      <div className="min-w-0 min-[420px]:col-span-6 lg:col-span-6">
        <TumpukanSitus hasil={hasil} label={situs} />
      </div>
      <div className="min-w-0 min-[420px]:col-span-6 lg:col-span-6">
        <BarTayanganSitus baris={analytics?.viewsBySite ?? []} label={situs} />
      </div>
      <div className="min-w-0 min-[420px]:col-span-6 lg:col-span-7">
        <PetaPanas sel={analytics?.aktivitasPerJam ?? []} />
      </div>
      <div className="min-w-0 min-[420px]:col-span-6 lg:col-span-5">
        <KalenderPanass series={deret} />
      </div>
      <div className="min-w-0 col-span-full">
        <AlurSankey arus={arusBerlabel} />
      </div>
      <div className="min-w-0 min-[420px]:col-span-6 lg:col-span-6">
        <PetaPohon judul="Pohon artikel" baris={pohonArtikel} kosong="Belum ada tayangan artikel." />
      </div>
      <div className="min-w-0 min-[420px]:col-span-6 lg:col-span-6">
        <GelembungTayangan baris={analytics?.viewsBySite ?? []} label={situs} />
      </div>
      <div className="min-w-0 min-[420px]:col-span-6 lg:col-span-7">
        <MatriksStatus hasil={hasilBerlabel} />
      </div>
      <div className="min-w-0 min-[420px]:col-span-6 lg:col-span-5">
        <LiniMasa peristiwa={analytics?.aktivitasTerbaru ?? []} />
      </div>
      <PeringkatTeratas judul="Top wilayah" baris={berlabel(analytics?.articlesByRegion, analytics?.regionLabels)} className="min-[420px]:col-span-3 lg:col-span-3" />
      <PeringkatTeratas judul="Top kategori" baris={berlabel(analytics?.articlesByCategory, analytics?.categoryLabels)} className="min-[420px]:col-span-3 lg:col-span-3" />
      <PeringkatTeratas judul="Top situs" baris={berlabel(analytics?.articlesBySite, analytics?.siteLabels)} className="min-[420px]:col-span-3 lg:col-span-3" />
      <PeringkatTeratas judul="Top penerbit" baris={berlabel(analytics?.articlesByPublisher, analytics?.publisherLabels)} className="min-[420px]:col-span-3 lg:col-span-3" />
    </div>
  );
}
