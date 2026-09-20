'use client';

import { Skeleton } from '@/components/ui/skeleton';

function BarisJudul({ sempit = false }: { readonly sempit?: boolean }) {
  return (
    <div aria-hidden="true">
      <Skeleton className="h-4 w-32 bg-bg-raised-2" />
      <Skeleton className={`mt-1.5 h-3 ${sempit ? 'w-24' : 'w-44'} bg-bg-raised-2`} />
    </div>
  );
}

function KerangkaKartu({
  label,
  span,
  anak,
}: {
  readonly label: string;
  readonly span: string;
  readonly anak: React.ReactNode;
}) {
  return (
    <div className={`min-w-0 ${span}`}>
      <div
        role="status"
        aria-busy="true"
        aria-label={label}
        data-skeleton={label}
        className="flex h-full min-w-0 animate-in flex-col overflow-hidden rounded-lg border border-hairline bg-bg-raised p-5 fade-in duration-200 sm:p-6"
      >
        {anak}
      </div>
    </div>
  );
}

/**
 * Skeleton KPI + sparkline (3 kartu: label, angka, delta, grafik h-12).
 *
 * @returns Strip KPI seukuran `KpiSparkline`.
 */
export function SkeletonKpi() {
  return (
    <div className="min-w-0 col-span-full" aria-hidden="true">
      <div className="grid min-w-0 grid-cols-1 gap-4 min-[420px]:grid-cols-3">
        {[0, 1, 2].map((indeks) => (
          <div key={indeks} className="h-full min-w-0 overflow-hidden rounded-lg border border-hairline bg-bg-raised p-5">
            <Skeleton className="h-3 w-20 bg-bg-raised-2" />
            <Skeleton className="mt-1 h-8 w-16 bg-bg-raised-2" />
            <Skeleton className="mt-1 h-3 w-28 bg-bg-raised-2" />
            <Skeleton className="mt-3 h-12 w-full bg-bg-raised-2" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton donat (lingkaran + legenda) dengan span bento yang sama.
 *
 * @param span - Kelas span kolom mengikuti kartu donat aslinya.
 * @returns Kartu donat seukuran `Donat`.
 */
export function SkeletonDonat({ span }: { readonly span: string }) {
  return (
    <KerangkaKartu label="Memuat donat" span={span} anak={(
      <>
        <div className="flex flex-wrap items-baseline justify-between gap-2" aria-hidden="true">
          <Skeleton className="h-4 w-28 bg-bg-raised-2" />
          <Skeleton className="h-3 w-14 bg-bg-raised-2" />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-4" aria-hidden="true">
          <Skeleton className="h-36 w-36 flex-none rounded-full bg-bg-raised-2 sm:h-40 sm:w-40" />
          <div className="min-w-0 flex-1 space-y-1.5">
            {[0, 1, 2].map((indeks) => (
              <div key={indeks} className="flex items-center gap-2">
                <Skeleton className="h-2 w-2 flex-none bg-bg-raised-2" />
                <Skeleton className="h-3 min-w-0 flex-1 bg-bg-raised-2" />
                <Skeleton className="h-3 w-8 flex-none bg-bg-raised-2" />
              </div>
            ))}
          </div>
        </div>
      </>
    )} />
  );
}

/**
 * Skeleton corong konversi (3 tahap batang).
 *
 * @returns Kartu corong seukuran `FunnelKonversi`.
 */
export function SkeletonCorong() {
  return (
    <KerangkaKartu label="Memuat corong" span="min-[420px]:col-span-6 lg:col-span-8" anak={(
      <>
        <Skeleton className="h-4 w-28 bg-bg-raised-2" aria-hidden="true" />
        <div className="mt-4 space-y-4" aria-hidden="true">
          {[0, 1, 2].map((indeks) => (
            <div key={indeks} className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_auto] items-center gap-3">
              <div className="space-y-1">
                <Skeleton className="h-3.5 w-24 bg-bg-raised-2" />
                <Skeleton className="h-3 w-16 bg-bg-raised-2" />
              </div>
              <Skeleton className="h-2 w-full bg-bg-raised-2" />
              <Skeleton className="h-4 w-10 bg-bg-raised-2" />
            </div>
          ))}
        </div>
      </>
    )} />
  );
}

/**
 * Skeleton radial (cincin + 2 baris angka).
 *
 * @returns Kartu radial seukuran `TingkatKeberhasilan`.
 */
export function SkeletonRadial() {
  return (
    <KerangkaKartu label="Memuat radial" span="min-[420px]:col-span-6 lg:col-span-4" anak={(
      <>
        <div className="flex flex-wrap items-baseline justify-between gap-2" aria-hidden="true">
          <Skeleton className="h-4 w-32 bg-bg-raised-2" />
          <Skeleton className="h-3 w-14 bg-bg-raised-2" />
        </div>
        <Skeleton className="mx-auto mt-2 h-40 w-40 rounded-full bg-bg-raised-2" aria-hidden="true" />
        <div className="mt-3 space-y-1.5" aria-hidden="true">
          <Skeleton className="h-3 w-full bg-bg-raised-2" />
          <Skeleton className="h-3 w-full bg-bg-raised-2" />
        </div>
      </>
    )} />
  );
}

/**
 * Skeleton grafik h-64 (area, garis, batang, sebar).
 *
 * @param label - Label aksesibilitas skeleton.
 * @param span - Kelas span kolom mengikuti kartu aslinya.
 * @returns Kartu grafik seukuran grafik `h-64` aslinya.
 */
export function SkeletonGrafik({ label, span }: { readonly label: string; readonly span: string }) {
  return (
    <KerangkaKartu label={label} span={span} anak={(
      <>
        <BarisJudul />
        <Skeleton className="mt-4 h-64 w-full bg-bg-raised-2" aria-hidden="true" />
      </>
    )} />
  );
}

/**
 * Skeleton peta panas 7×24.
 *
 * @returns Kartu panas seukuran `PetaPanas`.
 */
export function SkeletonPanas() {
  return (
    <KerangkaKartu label="Memuat peta panas" span="min-[420px]:col-span-6 lg:col-span-7" anak={(
      <>
        <BarisJudul />
        <div className="mt-4 space-y-1" aria-hidden="true">
          {[0, 1, 2, 3, 4, 5, 6].map((baris) => (
            <div key={baris} className="grid grid-cols-[3.5rem_repeat(24,minmax(0,1fr))] items-center gap-1">
              <Skeleton className="h-3 w-10 bg-bg-raised-2" />
              {Array.from({ length: 24 }, (_, sel) => (
                <Skeleton key={sel} className="h-4 w-full bg-bg-raised-2" />
              ))}
            </div>
          ))}
        </div>
        <Skeleton className="mt-3 h-3 w-32 bg-bg-raised-2" aria-hidden="true" />
      </>
    )} />
  );
}

/**
 * Skeleton kalender aktivitas (lajur minggu + pengalih rentang).
 *
 * @returns Kartu kalender seukuran `KalenderPanass`.
 */
export function SkeletonKalender() {
  return (
    <KerangkaKartu label="Memuat kalender" span="min-[420px]:col-span-6 lg:col-span-5" anak={(
      <>
        <div className="flex flex-wrap items-center justify-between gap-3" aria-hidden="true">
          <div>
            <Skeleton className="h-4 w-32 bg-bg-raised-2" />
            <Skeleton className="mt-1 h-3 w-24 bg-bg-raised-2" />
          </div>
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-7 w-12 bg-bg-raised-2" />
            <Skeleton className="h-7 w-12 bg-bg-raised-2" />
          </div>
        </div>
        <div className="mt-4 flex gap-1" aria-hidden="true">
          {Array.from({ length: 8 }, (_, lajur) => (
            <div key={lajur} className="flex flex-1 flex-col gap-1">
              {[0, 1, 2, 3, 4].map((sel) => (
                <Skeleton key={sel} className="h-3.5 w-full bg-bg-raised-2" />
              ))}
            </div>
          ))}
        </div>
      </>
    )} />
  );
}

/**
 * Skeleton Sankey (3 kolom simpul, setinggi h-80).
 *
 * @returns Kartu alur seukuran `AlurSankey`.
 */
export function SkeletonSankey() {
  return (
    <KerangkaKartu label="Memuat alur" span="col-span-full" anak={(
      <>
        <BarisJudul />
        <div className="mt-4 grid h-80 grid-cols-3 gap-6" aria-hidden="true">
          {[0, 1, 2].map((lajur) => (
            <div key={lajur} className="flex flex-col justify-between gap-2 py-2">
              {[0, 1, 2].map((simpul) => (
                <Skeleton key={simpul} className="w-full bg-bg-raised-2" style={{ height: `${64 - lajur * 12 - simpul * 8}px` }} />
              ))}
            </div>
          ))}
        </div>
      </>
    )} />
  );
}

/**
 * Skeleton matriks status (kepala + 8 baris).
 *
 * @returns Kartu matriks seukuran `MatriksStatus`.
 */
export function SkeletonMatriks() {
  return (
    <KerangkaKartu label="Memuat matriks" span="min-[420px]:col-span-6 lg:col-span-7" anak={(
      <>
        <BarisJudul />
        <div className="mt-4" aria-hidden="true">
          <div className="flex gap-2 border-b border-hairline pb-2">
            <Skeleton className="h-3 flex-1 bg-bg-raised-2" />
            <Skeleton className="h-3 w-16 bg-bg-raised-2" />
            <Skeleton className="h-3 w-12 bg-bg-raised-2" />
          </div>
          {[0, 1, 2, 3, 4, 5, 6, 7].map((baris) => (
            <div key={baris} className="flex items-center gap-2 border-b border-hairline/60 py-2.5 last:border-0">
              <Skeleton className="h-3.5 w-28 bg-bg-raised-2" />
              <Skeleton className="ml-auto h-3 w-10 bg-bg-raised-2" />
              <Skeleton className="h-3 w-10 bg-bg-raised-2" />
            </div>
          ))}
        </div>
      </>
    )} />
  );
}

/**
 * Skeleton lini masa (5 peristiwa).
 *
 * @returns Kartu lini masa seukuran `LiniMasa`.
 */
export function SkeletonLiniMasa() {
  return (
    <KerangkaKartu label="Memuat lini masa" span="min-[420px]:col-span-6 lg:col-span-5" anak={(
      <>
        <BarisJudul />
        <div className="mt-4 space-y-0" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((item) => (
            <div key={item} className="flex gap-3 pb-4 last:pb-0">
              <Skeleton className="mt-1.5 h-[11px] w-[11px] flex-none rounded-full bg-bg-raised-2" />
              <div className="min-w-0 flex-1 space-y-1">
                <Skeleton className="h-3.5 w-3/4 bg-bg-raised-2" />
                <Skeleton className="h-3 w-1/3 bg-bg-raised-2" />
              </div>
            </div>
          ))}
        </div>
      </>
    )} />
  );
}

/**
 * Skeleton peringkat 5 baris.
 *
 * @param judul - Judul kartu peringkat yang diwakili.
 * @returns Kartu peringkat seukuran `PeringkatTeratas`.
 */
export function SkeletonPeringkat({ judul }: { readonly judul: string }) {
  return (
    <KerangkaKartu label={`Memuat ${judul}`} span="min-[420px]:col-span-3 lg:col-span-3" anak={(
      <>
        <Skeleton className="h-4 w-24 bg-bg-raised-2" aria-hidden="true" />
        <div className="mt-3 space-y-2.5" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((baris) => (
            <div key={baris} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5">
              <Skeleton className="h-3 w-5 bg-bg-raised-2" />
              <div className="space-y-1">
                <Skeleton className="h-3.5 w-full bg-bg-raised-2" />
                <Skeleton className="h-1 w-full bg-bg-raised-2" />
              </div>
              <Skeleton className="h-3 w-8 bg-bg-raised-2" />
            </div>
          ))}
        </div>
      </>
    )} />
  );
}

/**
 * Skeleton seluruh bento utama dengan span dan tinggi per kartu aslinya.
 *
 * @returns Grid bento 12 kolom: KPI, donat, corong, tren, komposisi, panas, alur, distribusi.
 */
export function BentoUtamaLoading() {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 min-[420px]:grid-cols-6 lg:grid-cols-12 col-span-full" aria-busy="true" aria-label="Memuat dasbor utama">
      <SkeletonKpi />
      <SkeletonDonat span="min-[420px]:col-span-6 lg:col-span-5" />
      <SkeletonDonat span="min-[420px]:col-span-3 lg:col-span-4" />
      <SkeletonDonat span="min-[420px]:col-span-3 lg:col-span-3" />
      <SkeletonCorong />
      <SkeletonRadial />
      <SkeletonGrafik label="Memuat tren publikasi" span="min-[420px]:col-span-6 lg:col-span-7" />
      <SkeletonGrafik label="Memuat tren tayangan" span="min-[420px]:col-span-6 lg:col-span-5" />
      <SkeletonGrafik label="Memuat komposisi situs" span="min-[420px]:col-span-6 lg:col-span-6" />
      <SkeletonGrafik label="Memuat tayangan situs" span="min-[420px]:col-span-6 lg:col-span-6" />
      <SkeletonPanas />
      <SkeletonKalender />
      <SkeletonSankey />
      <SkeletonGrafik label="Memuat pohon artikel" span="min-[420px]:col-span-6 lg:col-span-6" />
      <SkeletonGrafik label="Memuat gelembung tayangan" span="min-[420px]:col-span-6 lg:col-span-6" />
      <SkeletonMatriks />
      <SkeletonLiniMasa />
      <SkeletonPeringkat judul="Wilayah teratas" />
      <SkeletonPeringkat judul="Kategori teratas" />
      <SkeletonPeringkat judul="Situs teratas" />
      <SkeletonPeringkat judul="Penerbit teratas" />
    </div>
  );
}

/**
 * Skeleton galeri telemetri mengikuti susunan `GaleriTelemetri`.
 *
 * @returns Tumpukan skeleton telemetri: tren, KPI, perbandingan, panas, alur, distribusi.
 */export function GaleriTelemetriLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Memuat statistik">
      <SkeletonGrafik label="Memuat tren publikasi" span="" />
      <SkeletonKpi />
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <SkeletonGrafik label="Memuat perbandingan" span="" />
        <SkeletonGrafik label="Memuat tugas bertumpuk" span="" />
      </div>
      <SkeletonPanas />
      <SkeletonKalender />
      <SkeletonSankey />
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <SkeletonGrafik label="Memuat pohon" span="" />
        <SkeletonGrafik label="Memuat gelembung" span="" />
      </div>
      <div className="grid min-w-0 gap-4 lg:grid-cols-12">
        <SkeletonMatriks />
        <SkeletonLiniMasa />
      </div>
      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        <SkeletonGrafik label="Memuat wilayah" span="" />
        <SkeletonGrafik label="Memuat kategori" span="" />
        <SkeletonGrafik label="Memuat penerbit" span="" />
        <SkeletonGrafik label="Memuat tugas" span="" />
        <SkeletonGrafik label="Memuat hasil situs" span="" />
      </div>
    </div>
  );
}
