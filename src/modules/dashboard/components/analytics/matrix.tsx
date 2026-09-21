import type { AnalyticsPoint } from '@/modules/dashboard/models';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/modules/dashboard/components/empty-state';
import { truncateLabel } from '@/modules/dashboard/components/analytics/chart-helpers';

const SITE_LIMIT = 8;

function parseMatrix(outcomes: readonly AnalyticsPoint[]): Map<string, Map<string, number>> {
  const matrix = new Map<string, Map<string, number>>();
  for (const point of outcomes) {
    const separatorIndex = point.key.indexOf(':');
    if (separatorIndex < 0) continue;
    const siteId = point.key.slice(0, separatorIndex);
    const status = point.key.slice(separatorIndex + 1);
    const row = matrix.get(siteId) ?? new Map<string, number>();
    row.set(status, (row.get(status) ?? 0) + point.count);
    matrix.set(siteId, row);
  }
  return matrix;
}

/**
 * Render a per-site health matrix by outcome status.
 *
 * @param results - `site:status` points from the analytics projection.
 * @returns Table of the top 8 sites with dynamic status columns.
 */
export function StatusMatrix({ results }: { readonly results: readonly AnalyticsPoint[] }) {
  const matrix = parseMatrix(results);
  const sites = [...matrix]
    .map(([name, row]) => ({ name, total: [...row.values()].reduce((a, b) => a + b, 0) }))
    .sort((left, right) => right.total - left.total)
    .slice(0, SITE_LIMIT);
  const status = [...new Set([...matrix.values()].flatMap((row) => [...row.keys()]))].sort();
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
      {sites.length === 0 ? (
        <EmptyState title="Belum ada hasil situs." description="Data akan tampil di sini setelah tersedia." />
      ) : (
        <div className="mt-4 overflow-x-auto">
          <Table className="w-full text-sm">
            <caption className="sr-only">Kesehatan situs per status hasil</caption>
            <TableHeader>
              <TableRow className="border-b border-hairline hover:bg-transparent">
                <TableHead scope="col" className="py-2 pr-3 text-left font-mono text-[11px] font-medium uppercase tracking-wider text-paper-faint">
                  Situs
                </TableHead>
                {status.map((name) => (
                  <TableHead key={name} scope="col" className="px-2 py-2 text-right font-mono text-[11px] font-medium uppercase tracking-wider text-paper-faint">
                    {truncateLabel(name, 10)}
                  </TableHead>
                ))}
                <TableHead scope="col" className="py-2 pl-2 text-right font-mono text-[11px] font-medium uppercase tracking-wider text-paper-faint">
                  Total
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sites.map(({ name, total }) => {
                const row = matrix.get(name) ?? new Map<string, number>();
                return (
                  <TableRow key={name} className="border-b border-hairline/60 last:border-0 hover:bg-transparent">
                    <th scope="row" title={name} className="max-w-44 py-2.5 pr-3 text-left font-sans text-[13px] font-medium break-all text-paper">
                      {name}
                    </th>
                    {status.map((state) => {
                      const value = row.get(state) ?? 0;
                      return (
                        <TableCell key={state} className="px-2 py-2.5 text-right font-mono text-xs tabular-nums text-paper-dim">
                          {value === 0 ? '–' : value.toLocaleString('id-ID')}
                        </TableCell>
                      );
                    })}
                    <TableCell className="py-2.5 pl-2 text-right font-mono text-xs font-bold tabular-nums text-paper">
                      {total.toLocaleString('id-ID')}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
