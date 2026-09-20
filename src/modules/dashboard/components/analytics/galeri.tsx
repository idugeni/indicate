'use client';

import { AlurSankey } from '@/modules/dashboard/components/analytics/sankey';
import { GelembungSitus } from '@/modules/dashboard/components/analytics/gelembung';
import { KalenderPanass, PetaPanas } from '@/modules/dashboard/components/analytics/panas';
import { KpiSparkline } from '@/modules/dashboard/components/analytics/kpi-spark';
import { LiniMasa } from '@/modules/dashboard/components/analytics/lini-masa';
import { MatriksStatus } from '@/modules/dashboard/components/analytics/matriks';
import { PerbandinganMetrik, TrenPublikasi } from '@/modules/dashboard/components/analytics/tren';
import { PetaPohon } from '@/modules/dashboard/components/analytics/pohon';
import { TelemetryCharts } from '@/modules/dashboard/components/analytics/telemetry-charts';
import { TugasBertumpuk } from '@/modules/dashboard/components/analytics/tumpukan';
import type { AnalyticsProjection } from '@/modules/dashboard/models';

/**
 * Render galeri visual Statistik & Grafik dari satu proyeksi.
 *
 * @param data - Proyeksi analitik per organisasi dari endpoint workspace.
 * @returns Tumpukan 15 visual inti: tren, KPI, perbandingan, panas, alur, dan distribusi.
 */
export function GaleriTelemetri({ data }: { readonly data: AnalyticsProjection }) {
  const deret = data.tugasHarian ?? [];
  return (
    <div className="space-y-6">
      <TrenPublikasi series={deret} />
      <KpiSparkline series={deret} />
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <PerbandinganMetrik series={deret} />
        <TugasBertumpuk series={deret} />
      </div>
      <PetaPanas sel={data.aktivitasPerJam ?? []} />
      <KalenderPanass series={deret} />
      <AlurSankey arus={data.arusPenerbit ?? []} />
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <PetaPohon judul="Pohon penerbit" baris={data.articlesByPublisher ?? []} kosong="Belum ada data penerbit." />
        <GelembungSitus hasil={data.outcomesBySiteAndState ?? []} />
      </div>
      <div className="grid min-w-0 gap-4 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-7">
          <MatriksStatus hasil={data.outcomesBySiteAndState ?? []} />
        </div>
        <div className="min-w-0 lg:col-span-5">
          <LiniMasa peristiwa={data.aktivitasTerbaru ?? []} />
        </div>
      </div>
      <TelemetryCharts data={data} />
    </div>
  );
}
