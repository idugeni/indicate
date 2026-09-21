'use client';

import { Treemap } from 'recharts';

import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { AnalyticsPoint } from '@/modules/dashboard/models';
import { PALET_KATEGORI } from '@/modules/dashboard/components/analytics/bantuan-grafik';
import { EmptyState } from '@/modules/dashboard/components/empty-state';

const BATAS_SEGMEN = 12;

function formatRingkas(nilai: number): string {
  if (!Number.isFinite(nilai) || nilai <= 0) return '0';
  if (nilai < 1000) return String(Math.round(nilai));
  if (nilai < 1_000_000) return `${(nilai / 1000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} rb`;
  return `${(nilai / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`;
}

function luminansRelatif(hex: string): number {
  const bersih = hex.replace('#', '');
  const kanal = (posisi: number): number => {
    const c = parseInt(bersih.slice(posisi, posisi + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * kanal(0) + 0.7152 * kanal(2) + 0.0722 * kanal(4);
}

function teksKontras(hex: string): string {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return '#f8fafc';
  const latar = luminansRelatif(hex);
  const gelap = luminansRelatif('#141a26');
  const terang = luminansRelatif('#f8fafc');
  const rasioGelap = (Math.max(latar, gelap) + 0.05) / (Math.min(latar, gelap) + 0.05);
  const rasioTerang = (Math.max(latar, terang) + 0.05) / (Math.min(latar, terang) + 0.05);
  return rasioGelap >= rasioTerang ? '#141a26' : '#f8fafc';
}

function potongUntukLebar(nama: string, lebar: number): string {
  const kapasitas = Math.max(4, Math.floor((lebar - 12) / 6.4));
  return nama.length > kapasitas ? `${nama.slice(0, Math.max(0, kapasitas - 1))}…` : nama;
}

interface SegmenPohon {
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

function IsiSegmen(props: SegmenPohon) {
  const x = Number(props.x ?? 0);
  const y = Number(props.y ?? 0);
  const lebar = Number(props.width ?? 0);
  const tinggi = Number(props.height ?? 0);
  if (!Number.isFinite(x) || !Number.isFinite(y) || lebar <= 0 || tinggi <= 0) return null;
  if (props.depth === 0) return null;
  const urutan = Number.isFinite(props.index) ? (props.index as number) : 0;
  const palet = props.colors !== undefined && props.colors.length > 0 ? props.colors : PALET_KATEGORI;
  const fill = palet[((Math.trunc(urutan) % palet.length) + palet.length) % palet.length] ?? '#8b93a7';
  const peringkat = Math.trunc(urutan) + 1;
  const nama = String(props.name ?? '');
  const nilai = Number(props.size ?? 0);
  const total = Number(props.total ?? 0);
  const stroke = props.stroke ?? '#0e1320';
  const tinta = teksKontras(fill);
  const redup = tinta === '#f8fafc' ? 'rgba(248,250,252,0.85)' : 'rgba(20,26,38,0.78)';
  const halo = tinta === '#f8fafc' ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.35)';
  const persen = total > 0 ? (nilai / total) * 100 : 0;
  const persenTeks = persen >= 10 ? String(Math.round(persen)) : persen.toLocaleString('id-ID', { maximumFractionDigits: 1 });
  const judulPenuh = `${nama}: ${nilai.toLocaleString('id-ID')} tayangan (${persenTeks}%)`;
  if (lebar < 30 || tinggi < 26) {
    return (
      <g>
        <rect x={x} y={y} width={lebar} height={tinggi} fill={fill} stroke={stroke} strokeWidth={2} rx={3}>
          <title>{judulPenuh}</title>
        </rect>
      </g>
    );
  }
  if (lebar < 56 || tinggi < 44) {
    return (
      <g>
        <rect x={x} y={y} width={lebar} height={tinggi} fill={fill} stroke={stroke} strokeWidth={2} rx={3}>
          <title>{judulPenuh}</title>
        </rect>
        <text
          x={x + lebar / 2}
          y={y + tinggi / 2 + 3.5}
          textAnchor="middle"
          fontSize={10}
          fontWeight={600}
          fontFamily="IBM Plex Mono, monospace"
          fill={tinta}
          stroke={halo}
          strokeWidth={2.5}
          paintOrder="stroke"
          strokeLinejoin="round"
        >
          {formatRingkas(nilai)}
        </text>
      </g>
    );
  }
  const label = potongUntukLebar(nama, lebar);
  const barisNilai = `${formatRingkas(nilai)} · ${persenTeks}%`;
  const mungil = lebar < 92 || tinggi < 64;
  return (
    <g>
      <rect x={x} y={y} width={lebar} height={tinggi} fill={fill} stroke={stroke} strokeWidth={2} rx={3}>
        <title>{judulPenuh}</title>
      </rect>
      <text
        x={x + 6}
        y={y + 14}
        fontSize={10}
        fontFamily="IBM Plex Mono, monospace"
        fill={redup}
        stroke={halo}
        strokeWidth={2.5}
        paintOrder="stroke"
        strokeLinejoin="round"
      >
        #{peringkat}
      </text>
      <text
        x={x + 6}
        y={mungil ? y + 28 : y + 29}
        fontSize={11}
        fontWeight={600}
        fontFamily="IBM Plex Sans, system-ui, sans-serif"
        fill={tinta}
        stroke={halo}
        strokeWidth={3}
        paintOrder="stroke"
        strokeLinejoin="round"
      >
        {label}
      </text>
      <text
        x={x + 6}
        y={mungil ? y + 41 : y + 44}
        fontSize={10}
        fontFamily="IBM Plex Mono, monospace"
        fill={redup}
        stroke={halo}
        strokeWidth={2.5}
        paintOrder="stroke"
        strokeLinejoin="round"
      >
        {barisNilai}
      </text>
    </g>
  );
}

/**
 * Render distribusi volume sebagai treemap.
 *
 * @param judul - Judul kartu yang tampil.
 * @param baris - Titik dimensi (`key` + `count`).
 * @param kosong - Teks pengganti saat nihil.
 * @returns Kartu treemap 12 segmen teratas.
 */
export function PetaPohon({
  judul,
  baris,
  kosong,
}: {
  readonly judul: string;
  readonly baris: readonly AnalyticsPoint[];
  readonly kosong: string;
}) {
  const data = [...baris]
    .sort((kiri, kanan) => kanan.count - kiri.count)
    .slice(0, BATAS_SEGMEN)
    .map((titik) => ({ name: titik.key, size: titik.count }));
  const total = data.reduce((jumlah, segmen) => jumlah + segmen.size, 0);
  return (
    <section
      aria-label={judul}
      className="flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-hairline bg-bg-raised p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="m-0 font-sans text-sm font-semibold tracking-tight text-paper">
            {judul}
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
        <EmptyState title={kosong} description="Data akan tampil di sini setelah tersedia." />
      ) : (
        <ChartContainer config={{}} className="mt-4 h-64 w-full">
          <Treemap
            data={data}
            dataKey="size"
            stroke="#0e1320"
            colorPanel={[...PALET_KATEGORI]}
            isAnimationActive={false}
            content={<IsiSegmen total={total} />}
          >
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(nilai, nama) => (
                    <span className="font-mono tabular-nums">
                      {typeof nilai === 'number' ? nilai.toLocaleString('id-ID') : String(nilai ?? '')}
                      {' · '}
                      {String(nama ?? '')}
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
