import type { AnalyticsPoint } from '@/modules/dashboard/models';
import { potongLabel } from '@/modules/dashboard/components/analytics/bantuan-grafik';

const BATAS_SITUS = 8;

function urai(hasil: readonly AnalyticsPoint[]): Map<string, Map<string, number>> {
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
  return matriks;
}

/**
 * Render matriks kesehatan seluruh situs per status hasil.
 *
 * @param hasil - Titik `situs:status` dari proyeksi analitik.
 * @returns Tabel 8 situs teratas dengan kolom status dinamis.
 */
export function MatriksStatus({ hasil }: { readonly hasil: readonly AnalyticsPoint[] }) {
  const matriks = urai(hasil);
  const situs = [...matriks]
    .map(([nama, baris]) => ({ nama, total: [...baris.values()].reduce((a, b) => a + b, 0) }))
    .sort((kiri, kanan) => kanan.total - kiri.total)
    .slice(0, BATAS_SITUS);
  const status = [...new Set([...matriks.values()].flatMap((baris) => [...baris.keys()]))].sort();
  return (
    <section
      aria-label="Matriks status"
      className="flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-hairline bg-bg-raised p-5 sm:p-6"
    >
      <h2 className="m-0 font-sans text-sm font-semibold tracking-tight text-paper">
        Matriks status
      </h2>
      <p className="m-0 mt-0.5 font-sans text-xs text-paper-faint">
        Kesehatan situs teratas per status hasil
      </p>
      {situs.length === 0 ? (
        <p className="m-auto px-2 py-6 text-center font-sans text-[13px] text-paper-dim">Belum ada hasil situs.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">Kesehatan situs per status hasil</caption>
            <thead>
              <tr className="border-b border-hairline">
                <th scope="col" className="py-2 pr-3 text-left font-mono text-[11px] font-medium uppercase tracking-wider text-paper-faint">
                  Situs
                </th>
                {status.map((nama) => (
                  <th key={nama} scope="col" className="px-2 py-2 text-right font-mono text-[11px] font-medium uppercase tracking-wider text-paper-faint">
                    {potongLabel(nama, 10)}
                  </th>
                ))}
                <th scope="col" className="py-2 pl-2 text-right font-mono text-[11px] font-medium uppercase tracking-wider text-paper-faint">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {situs.map(({ nama, total }) => {
                const baris = matriks.get(nama) ?? new Map<string, number>();
                return (
                  <tr key={nama} className="border-b border-hairline/60 last:border-0">
                    <th scope="row" title={nama} className="max-w-44 py-2.5 pr-3 text-left font-sans text-[13px] font-medium break-all text-paper">
                      {nama}
                    </th>
                    {status.map((keadaan) => {
                      const nilai = baris.get(keadaan) ?? 0;
                      return (
                        <td key={keadaan} className="px-2 py-2.5 text-right font-mono text-xs tabular-nums text-paper-dim">
                          {nilai === 0 ? '–' : nilai.toLocaleString('id-ID')}
                        </td>
                      );
                    })}
                    <td className="py-2.5 pl-2 text-right font-mono text-xs font-bold tabular-nums text-paper">
                      {total.toLocaleString('id-ID')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
