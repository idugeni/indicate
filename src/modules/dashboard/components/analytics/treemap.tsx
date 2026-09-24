'use client';

import { Treemap } from 'recharts';

import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { AnalyticsPoint } from '@/modules/dashboard/models';
import { CATEGORY_PALETTE } from '@/modules/dashboard/components/analytics/chart-helpers';
import { EmptyState } from '@/modules/dashboard/components/empty-state';

const SEGMENT_LIMIT = 12;

function formatCompact(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0';
  if (value < 1000) return String(Math.round(value));
  if (value < 1_000_000) return `${(value / 1000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} rb`;
  return `${(value / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`;
}

function relativeLuminance(hex: string): number {
  const clean = hex.replace('#', '');
  const channel = (position: number): number => {
    const c = parseInt(clean.slice(position, position + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
}

function contrastText(hex: string): string {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return '#f8fafc';
  const background = relativeLuminance(hex);
  const dark = relativeLuminance('#141a26');
  const light = relativeLuminance('#f8fafc');
  const darkRatio = (Math.max(background, dark) + 0.05) / (Math.min(background, dark) + 0.05);
  const lightRatio = (Math.max(background, light) + 0.05) / (Math.min(background, light) + 0.05);
  return darkRatio >= lightRatio ? '#141a26' : '#f8fafc';
}

function truncateToWidth(name: string, width: number): string {
  const capacity = Math.max(4, Math.floor((width - 12) / 6.4));
  return name.length > capacity ? `${name.slice(0, Math.max(0, capacity - 1))}…` : name;
}

interface TreeSegment {
  readonly x?: number | string;
  readonly y?: number | string;
  readonly width?: number | string;
  readonly height?: number | string;
  readonly name?: string;
  readonly size?: number;
  readonly index?: number;
  readonly depth?: number;
  readonly colors?: readonly string[];
  readonly stroke?: string;
  readonly total?: number;
}

function SegmentContent(props: TreeSegment) {
  const x = Number(props.x ?? 0);
  const y = Number(props.y ?? 0);
  const width = Number(props.width ?? 0);
  const height = Number(props.height ?? 0);
  if (!Number.isFinite(x) || !Number.isFinite(y) || width <= 0 || height <= 0) return null;
  if (props.depth === 0) return null;
  const order = Number.isFinite(props.index) ? (props.index as number) : 0;
  const palette = props.colors !== undefined && props.colors.length > 0 ? props.colors : CATEGORY_PALETTE;
  const fill = palette[((Math.trunc(order) % palette.length) + palette.length) % palette.length] ?? '#8b93a7';
  const rank = Math.trunc(order) + 1;
  const name = String(props.name ?? '');
  const value = Number(props.size ?? 0);
  const total = Number(props.total ?? 0);
  const stroke = props.stroke ?? '#0e1320';
  const ink = contrastText(fill);
  const muted = ink === '#f8fafc' ? 'rgba(248,250,252,0.85)' : 'rgba(20,26,38,0.78)';
  const outline = ink === '#f8fafc' ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.35)';
  const percent = total > 0 ? (value / total) * 100 : 0;
  const percentText = percent >= 10 ? String(Math.round(percent)) : percent.toLocaleString('id-ID', { maximumFractionDigits: 1 });
  const fullTitle = `${name}: ${value.toLocaleString('id-ID')} tayangan (${percentText}%)`;
  if (width < 30 || height < 26) {
    return (
      <g>
        <rect x={x} y={y} width={width} height={height} fill={fill} stroke={stroke} strokeWidth={2} rx={3}>
          <title>{fullTitle}</title>
        </rect>
      </g>
    );
  }
  if (width < 56 || height < 44) {
    return (
      <g>
        <rect x={x} y={y} width={width} height={height} fill={fill} stroke={stroke} strokeWidth={2} rx={3}>
          <title>{fullTitle}</title>
        </rect>
        <text
          x={x + width / 2}
          y={y + height / 2 + 3.5}
          textAnchor="middle"
          fontSize={10}
          fontWeight={600}
          fontFamily="IBM Plex Mono, monospace"
          fill={ink}
          stroke={outline}
          strokeWidth={2.5}
          paintOrder="stroke"
          strokeLinejoin="round"
        >
          {formatCompact(value)}
        </text>
      </g>
    );
  }
  const label = truncateToWidth(name, width);
  const valueLine = `${formatCompact(value)} · ${percentText}%`;
  const compact = width < 92 || height < 64;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={fill} stroke={stroke} strokeWidth={2} rx={3}>
        <title>{fullTitle}</title>
      </rect>
      <text
        x={x + 6}
        y={y + 14}
        fontSize={10}
        fontFamily="IBM Plex Mono, monospace"
        fill={muted}
        stroke={outline}
        strokeWidth={2.5}
        paintOrder="stroke"
        strokeLinejoin="round"
      >
        #{rank}
      </text>
      <text
        x={x + 6}
        y={compact ? y + 28 : y + 29}
        fontSize={11}
        fontWeight={600}
        fontFamily="IBM Plex Sans, system-ui, sans-serif"
        fill={ink}
        stroke={outline}
        strokeWidth={3}
        paintOrder="stroke"
        strokeLinejoin="round"
      >
        {label}
      </text>
      <text
        x={x + 6}
        y={compact ? y + 41 : y + 44}
        fontSize={10}
        fontFamily="IBM Plex Mono, monospace"
        fill={muted}
        stroke={outline}
        strokeWidth={2.5}
        paintOrder="stroke"
        strokeLinejoin="round"
      >
        {valueLine}
      </text>
    </g>
  );
}

/**
 * Render a volume distribution as a treemap.
 *
 * @param title - Visible card title.
 * @param rows - Dimension points (`key` + `count`).
 * @param emptyText - Replacement text when empty.
 * @returns Treemap card with the top 12 segments.
 */
export function TreeMap({
  title,
  rows,
  emptyText,
}: {
  readonly title: string;
  readonly rows: readonly AnalyticsPoint[];
  readonly emptyText: string;
}) {
  const data = [...rows]
    .sort((left, right) => right.count - left.count)
    .slice(0, SEGMENT_LIMIT)
    .map((point) => ({ name: point.key, size: point.count }));
  const total = data.reduce((count, segment) => count + segment.size, 0);
  return (
    <section
      aria-label={title}
      className="flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-hairline bg-bg-raised p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="m-0 font-sans text-sm font-semibold tracking-tight text-paper">
            {title}
          </h2>
          <p className="m-0 mt-0.5 font-sans text-xs text-paper-faint">
            12 teratas berdasar tayangan
          </p>
        </div>
        <p className="m-0 font-mono text-[11px] tabular-nums text-paper-faint">
          {total.toLocaleString('id-ID')} total
        </p>
      </div>
      {data.length === 0 ? (
        <EmptyState title={emptyText} description="Data akan tampil di sini setelah tersedia." className="mt-4" />
      ) : (
        <ChartContainer config={{}} className="mt-4 h-64 w-full">
          <Treemap
            data={data}
            dataKey="size"
            stroke="#0e1320"
            colorPanel={[...CATEGORY_PALETTE]}
            isAnimationActive={false}
            content={<SegmentContent total={total} />}
          >
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) => (
                    <span className="font-mono tabular-nums">
                      {typeof value === 'number' ? value.toLocaleString('id-ID') : String(value ?? '')}
                      {' · '}
                      {String(name ?? '')}
                    </span>
                  )}
                />
              }
            />
          </Treemap>
        </ChartContainer>
      )}
    </section>
  );
}
