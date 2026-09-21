'use client';

import { Sankey, Tooltip } from 'recharts';
import type { SankeyNode } from 'recharts/types/util/types';

import { ChartContainer } from '@/components/ui/chart';
import type { ArusPenerbit } from '@/modules/dashboard/models';
import { truncateLabel, categoryColor } from '@/modules/dashboard/components/analytics/chart-helpers';
import { EmptyState } from '@/modules/dashboard/components/empty-state';

const NODE_LIMIT = 6;

interface FlowLink {
  readonly source: number;
  readonly target: number;
  readonly value: number;
}

function countBy(flows: readonly ArusPenerbit[], pick: (row: ArusPenerbit) => string): Map<string, number> {
  const total = new Map<string, number>();
  for (const row of flows) {
    const key = pick(row);
    total.set(key, (total.get(key) ?? 0) + row.jumlah);
  }
  return total;
}

function topN(total: Map<string, number>): string[] {
  return [...total].sort((left, right) => right[1] - left[1]).slice(0, NODE_LIMIT).map(([key]) => key);
}

function remainder(total: Map<string, number>, top: readonly string[]): number {
  return [...total].filter(([key]) => !top.includes(key)).reduce((count, [, value]) => count + value, 0);
}

function buildGraph(flows: readonly ArusPenerbit[]): { nodes: { name: string }[]; links: FlowLink[] } {
  const publisherTotals = countBy(flows, (row) => row.penerbit);
  const siteTotals = countBy(flows, (row) => row.situs);
  const topPublishers = topN(publisherTotals);
  const topSites = topN(siteTotals);
  const otherPublishers = remainder(publisherTotals, topPublishers) > 0 ? ['Penerbit lain'] : [];
  const otherSites = remainder(siteTotals, topSites) > 0 ? ['Situs lain'] : [];
  const outcomes = [...new Set(flows.map((row) => row.hasil))].sort();
  const publisherName = (value: string): string => (topPublishers.includes(value) ? value : 'Penerbit lain');
  const siteName = (value: string): string => (topSites.includes(value) ? value : 'Situs lain');
  const nodes = [...topPublishers, ...otherPublishers, ...topSites, ...otherSites, ...outcomes].map((name) => ({ name }));
  const indexByName = new Map(nodes.map((node, position) => [node.name, position]));
  const linkTotals = new Map<string, number>();
  const addLink = (from: string, to: string, value: number): void => {
    const source = indexByName.get(from) ?? 0;
    const target = indexByName.get(to) ?? 0;
    const key = `${source}:${target}`;
    linkTotals.set(key, (linkTotals.get(key) ?? 0) + value);
  };
  for (const row of flows) {
    addLink(publisherName(row.penerbit), siteName(row.situs), row.jumlah);
    addLink(siteName(row.situs), row.hasil, row.jumlah);
  }
  const links = [...linkTotals]
    .filter(([, value]) => value > 0)
    .map(([key, value]) => {
      const [source, target] = key.split(':').map(Number);
      return { source: source ?? 0, target: target ?? 0, value };
    });
  return { nodes, links };
}

function FlowNode(props: { readonly x?: number | undefined; readonly y?: number | undefined; readonly width?: number | undefined; readonly height?: number | undefined; readonly index?: number | undefined; readonly payload?: SankeyNode | undefined }) {
  const { x = 0, y = 0, width = 0, height = 0, index = 0, payload } = props;
  const depth = payload?.depth ?? 1;
  const name = payload?.name ?? '';
  const color = categoryColor(index);
  const right = depth === 2;
  return (
    <g>
      <rect x={x} y={y} width={width} height={Math.max(height, 2)} fill={color} fillOpacity={0.9} rx={2} />
      <text
        x={right ? x - 6 : x + width + 6}
        y={y + height / 2}
        textAnchor={right ? 'end' : 'start'}
        dominantBaseline="central"
        fontSize={11}
        fill="#9fa6b8"
      >
        {truncateLabel(name, 16)}
      </text>
    </g>
  );
}

function SankeyTooltip({ active, payload }: { readonly active?: boolean; readonly payload?: readonly { readonly value?: number | string }[] }) {
  if (active !== true || payload === undefined || payload.length === 0) return null;
  const value = payload[0]?.value;
  return (
    <div className="rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
      <span className="font-mono font-medium tabular-nums text-foreground">
        {typeof value === 'number' ? value.toLocaleString('id-ID') : String(value ?? '')}
      </span>
    </div>
  );
}

/**
 * Render a publisher-to-site-to-outcome flow as a Sankey diagram.
 *
 * @param flows - Flow edges from the analytics projection; nodes capped at top 6 per level.
 * @returns Three-level Sankey card.
 */
export function SankeyFlow({ flows }: { readonly flows: readonly ArusPenerbit[] }) {
  if (flows.length === 0) {
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
  const { nodes, links } = buildGraph(flows);
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
          node={<FlowNode />}
          nodeWidth={10}
          nodePadding={12}
          margin={{ top: 8, right: 24, bottom: 8, left: 24 }}
          link={{ stroke: '#2a3348', strokeOpacity: 0.9, fill: '#2a3348', fillOpacity: 0.55 }}
          sort={false}
        >
          <Tooltip content={<SankeyTooltip />} />
        </Sankey>
      </ChartContainer>
    </section>
  );
}
