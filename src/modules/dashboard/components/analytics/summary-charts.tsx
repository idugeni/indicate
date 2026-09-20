'use client';

import { Cell, Pie, PieChart, PolarAngleAxis, RadialBar, RadialBarChart } from 'recharts';

import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { cn } from '@/ui/cn';

const WARNA_STATUS: Record<string, string> = {
  queued: '#d8a94e',
  processing: '#6c93c9',
  published: '#5fcbb0',
  failed: '#d9705f',
  retrying: '#cc9a44',
};

const WARNA_HASIL: Record<string, string> = {
  berhasil: '#5fcbb0',
  gagal: '#d9705f',
};

interface Irisan {
  readonly nama: string;
  readonly nilai: number;
  readonly warna: string;
}

/**
 * Render donat distribusi untuk satu dimensi ringkasan.
 *
 * @param judul - Judul kartu yang tampil.
 * @param irisan - Potongan donat beserta warna token dark.
 * @param kosong - Teks pengganti saat total nol.
 * @param className - Span bento dari grid induk.
 * @returns Kartu donat dengan legenda angka id-ID.
 */
function Donat({
  judul,
  irisan,
  kosong,
  className,
}: {
  readonly judul: string;
  readonly irisan: readonly Irisan[];
  readonly kosong: string;
  readonly className?: string;
}) {
  const total = irisan.reduce((jumlah, potong) => jumlah + potong.nilai, 0);
  return (
    <section
      aria-label={judul}
      className={cn('flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-hairline bg-bg-raised p-5', className)}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="m-0 font-sans text-sm font-semibold tracking-tight text-paper">
          {judul}
        </h2>
        <p className="m-0 font-mono text-[11px] tabular-nums text-paper-faint">
          {total.toLocaleString('id-ID')} total
        </p>
      </div>
      {total === 0 ? (
        <p className="m-auto px-2 py-6 text-center font-sans text-[13px] leading-relaxed text-paper-dim">{kosong}</p>
      ) : (
        <div className="mt-2 flex flex-wrap items-center gap-4">
          <ChartContainer config={{ nilai: { label: judul } }} className="aspect-square w-36 flex-none sm:w-40">
            <PieChart>
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(nilai) =>
                      typeof nilai === 'number' ? nilai.toLocaleString('id-ID') : String(nilai ?? '')
                    }
                  />
                }
              />
              <Pie
                data={[...irisan]}
                dataKey="nilai"
                nameKey="nama"
                innerRadius={44}
                outerRadius={64}
                paddingAngle={2}
                strokeWidth={0}
              >
                {irisan.map((potong) => (
                  <Cell key={potong.nama} fill={potong.warna} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <ul className="m-0 min-w-0 flex-1 list-none space-y-1.5 p-0">
            {irisan.map((potong) => (
              <li key={potong.nama} className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="h-2 w-2 flex-none rounded-[2px]"
                  style={{ backgroundColor: potong.warna }}
                />
                <span className="min-w-0 flex-1 truncate font-mono text-[11px] uppercase tracking-wider text-paper-dim" title={potong.nama}>
                  {potong.nama}
                </span>
                <span className="flex-none font-mono text-xs font-bold tabular-nums text-paper">
                  {potong.nilai.toLocaleString('id-ID')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

/**
 * Render visual ringkasan dasbor utama dari snapshot organisasi.
 *
 * @param jobs - Cacah tugas penerbitan per status.
 * @param berhasil - Jumlah hasil situs yang sukses.
 * @param gagal - Jumlah hasil situs yang gagal.
 * @param aktif - Jumlah artikel aktif.
 * @param arsip - Jumlah artikel yang diarsipkan.
 * @returns Fragmen tiga kartu donat siap tata bento induk.
 */
export function SummaryCharts({
  jobs,
  berhasil,
  gagal,
  aktif,
  arsip,
}: {
  readonly jobs: Readonly<Record<string, number>>;
  readonly berhasil: number;
  readonly gagal: number;
  readonly aktif: number;
  readonly arsip: number;
}) {
  return (
    <>
      <Donat
        judul="Distribusi antrean"
        kosong="Belum ada tugas penerbitan. Tugas antrean akan terisi setelah artikel pertama dijadwalkan."
        className="min-[420px]:col-span-6 lg:col-span-5"
        irisan={Object.entries(jobs).map(([status, nilai]) => ({
          nama: status,
          nilai: Number(nilai),
          warna: WARNA_STATUS[status] ?? '#8b93a7',
        }))}
      />
      <Donat
        judul="Komposisi hasil"
        kosong="Belum ada hasil penyaluran. Hasil situs akan diringkas di sini setelah antrean pertama berjalan."
        className="min-[420px]:col-span-3 lg:col-span-4"
        irisan={[
          { nama: 'berhasil', nilai: berhasil, warna: WARNA_HASIL.berhasil ?? '#5fcbb0' },
          { nama: 'gagal', nilai: gagal, warna: WARNA_HASIL.gagal ?? '#d9705f' },
        ]}
      />
      <Donat
        judul="Komposisi artikel"
        kosong="Belum ada artikel. Tulis naskah perdana dari ruang redaksi."
        className="min-[420px]:col-span-3 lg:col-span-3"
        irisan={[
          { nama: 'aktif', nilai: aktif, warna: '#cc9a44' },
          { nama: 'arsip', nilai: arsip, warna: '#8b93a7' },
        ]}
      />
    </>
  );
}

/**
 * Render cincin tingkat keberhasilan penyaluran.
 *
 * @param berhasil - Jumlah hasil situs yang sukses.
 * @param gagal - Jumlah hasil situs yang gagal.
 * @param className - Span bento dari grid induk.
 * @returns Kartu radial dengan angka persen di tengah.
 */
export function TingkatKeberhasilan({
  berhasil,
  gagal,
  className,
}: {
  readonly berhasil: number;
  readonly gagal: number;
  readonly className?: string;
}) {
  const total = berhasil + gagal;
  const kadar = total > 0 ? Math.round((berhasil / total) * 100) : 0;
  return (
    <section
      aria-label="Tingkat keberhasilan"
      className={cn('flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-hairline bg-bg-raised p-5', className)}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="m-0 font-sans text-sm font-semibold tracking-tight text-paper">
          Tingkat keberhasilan
        </h2>
        <p className="m-0 font-mono text-[11px] tabular-nums text-paper-faint">
          {total.toLocaleString('id-ID')} hasil
        </p>
      </div>
      {total === 0 ? (
        <p className="m-auto px-2 py-6 text-center font-sans text-[13px] leading-relaxed text-paper-dim">
          Belum ada hasil penyaluran. Cincin terisi setelah antrean pertama berjalan.
        </p>
      ) : (
        <>
          <div className="relative mx-auto mt-2 w-full max-w-52">
            <ChartContainer config={{ kadar: { label: 'Keberhasilan', color: '#5fcbb0' } }} className="aspect-square w-full">
              <RadialBarChart
                data={[{ nama: 'sukses', kadar }]}
                startAngle={90}
                endAngle={-270}
                innerRadius="74%"
                outerRadius="100%"
              >
                <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                <RadialBar
                  dataKey="kadar"
                  cornerRadius={8}
                  fill="var(--color-kadar)"
                  background={{ fill: '#1c2436' }}
                  angleAxisId={0}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(nilai) =>
                        typeof nilai === 'number' ? `${nilai}%` : String(nilai ?? '')
                      }
                    />
                  }
                />
              </RadialBarChart>
            </ChartContainer>
            <p className="pointer-events-none absolute inset-0 m-0 flex flex-col items-center justify-center">
              <span className="font-mono text-3xl font-bold tabular-nums tracking-tight text-paper">
                {kadar}
                <span className="text-base font-medium text-paper-faint">%</span>
              </span>
              <span className="font-sans text-xs text-paper-faint">sukses</span>
            </p>
          </div>
          <dl className="m-0 mt-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <dt className="font-sans text-xs text-paper-dim">Berhasil</dt>
              <dd className="m-0 font-mono text-xs font-bold tabular-nums text-signal">
                {berhasil.toLocaleString('id-ID')}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="font-sans text-xs text-paper-dim">Gagal</dt>
              <dd className="m-0 font-mono text-xs font-bold tabular-nums text-error">
                {gagal.toLocaleString('id-ID')}
              </dd>
            </div>
          </dl>
        </>
      )}
    </section>
  );
}
