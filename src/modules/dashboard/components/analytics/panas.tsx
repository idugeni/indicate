'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import type { AktivitasJam, TugasHarian } from '@/modules/dashboard/models';
import { labelHari } from '@/modules/dashboard/components/analytics/bantuan-grafik';

const NAMA_HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'] as const;

function skala(nilai: number, maks: number): number {
  if (nilai <= 0 || maks <= 0) return 0;
  return 0.22 + 0.78 * (nilai / maks);
}

/**
 * Render peta panas aktivitas per hari dan jam (Asia/Jakarta).
 *
 * @param sel - Sel aktivitas nonzero dari proyeksi analitik.
 * @returns Grid 7×24 dengan intensitas warna.
 */
export function PetaPanas({ sel }: { readonly sel: readonly AktivitasJam[] }) {
  const peta = new Map(sel.map((titik) => [`${titik.hari}:${titik.jam}`, titik.jumlah]));
  const maks = Math.max(...sel.map((titik) => titik.jumlah), 1);
  const jam = Array.from({ length: 24 }, (_, nilai) => nilai);
  return (
    <section
      aria-label="Peta panas"
      className="flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-hairline bg-bg-raised p-5 sm:p-6"
    >
      <h2 className="m-0 font-sans text-sm font-semibold tracking-tight text-paper">
        Peta panas
      </h2>
      <p className="m-0 mt-0.5 font-sans text-xs text-paper-faint">
        Intensitas hasil per hari dan jam (WIB)
      </p>
      <div className="mt-4 space-y-1 overflow-x-auto">
        <div className="grid min-w-[30rem] grid-cols-[3.5rem_repeat(24,minmax(0,1fr))] items-center gap-1">
          <span />
          {jam.map((nilai) =>
            nilai % 6 === 0 ? (
              <span key={nilai} className="text-center font-mono text-[10px] tabular-nums text-paper-faint">
                {String(nilai).padStart(2, '0')}
              </span>
            ) : (
              <span key={nilai} />
            ),
          )}
        </div>
        {NAMA_HARI.map((nama, hari) => (
          <div key={nama} className="grid min-w-[30rem] grid-cols-[3.5rem_repeat(24,minmax(0,1fr))] items-center gap-1">
            <span className="truncate font-sans text-[11px] text-paper-dim">{nama}</span>
            {jam.map((nilai) => {
              const jumlah = peta.get(`${hari}:${nilai}`) ?? 0;
              return (
                <span
                  key={nilai}
                  title={`${nama} ${String(nilai).padStart(2, '0')}:00 — ${jumlah}`}
                  className="h-4 w-full rounded-[3px]"
                  style={
                    jumlah === 0
                      ? undefined
                      : { backgroundColor: '#d8a94e', opacity: skala(jumlah, maks) }
                  }
                />
              );
            })}
          </div>
        ))}
      </div>
      <p className="m-0 mt-3 font-mono text-[11px] tabular-nums text-paper-faint">
        Puncak: {maks.toLocaleString('id-ID')} per jam
      </p>
    </section>
  );
}

/**
 * Render kalender panas aktivitas publikasi harian.
 *
 * @param series - Ember harian dari proyeksi analitik.
 * @returns Grid minggu × hari dengan pengalih 30/90 hari.
 */
export function KalenderPanass({ series }: { readonly series: readonly TugasHarian[] }) {
  const [rentang, setRentang] = useState<number>(90);
  const potong = series.slice(-rentang);
  const total = (titik: TugasHarian): number => titik.diterbitkan + titik.gagal + titik.antre;
  const maks = Math.max(...potong.map(total), 1);
  const kosongAwal = potong.length === 0 ? 0 : (new Date(`${potong[0]?.hari ?? ''}T00:00:00Z`).getUTCDay() + 6) % 7;
  const selKosong = Number.isNaN(kosongAwal) ? 0 : kosongAwal;
  const sel: readonly (TugasHarian | null)[] = [...Array<TugasHarian | null>(selKosong).fill(null), ...potong];
  const kolom: (TugasHarian | null)[][] = [];
  sel.forEach((titik, indeks) => {
    const lajur = Math.floor(indeks / 7);
    kolom[lajur] = [...(kolom[lajur] ?? []), titik];
  });
  const totalSemua = potong.reduce((jumlah, titik) => jumlah + total(titik), 0);
  return (
    <section
      aria-label="Kalender aktivitas"
      className="flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-hairline bg-bg-raised p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="m-0 font-sans text-sm font-semibold tracking-tight text-paper">
            Kalender aktivitas
          </h2>
          <p className="m-0 mt-0.5 font-mono text-[11px] tabular-nums text-paper-faint">
            {totalSemua.toLocaleString('id-ID')} tugas dalam rentang
          </p>
        </div>
        <div role="group" aria-label="Rentang kalender" className="flex items-center gap-1.5">
          {[30, 90].map((pilihan) => (
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
      {potong.length === 0 ? (
        <p className="m-auto px-2 py-6 text-center font-sans text-[13px] text-paper-dim">Belum ada data deret waktu.</p>
      ) : (
        <div className="mt-4 flex gap-1 overflow-x-auto pb-1">
          {kolom.map((lajur, indeks) => (
            <div key={indeks} className="flex flex-1 flex-col gap-1">
              {lajur.map((titik, baris) =>
                titik === null ? (
                  <span key={baris} className="h-3.5 w-full rounded-[3px]" />
                ) : (
                  <span
                    key={baris}
                    title={`${labelHari(titik.hari)} — ${total(titik)}`}
                    className="h-3.5 w-full rounded-[3px] bg-bg-raised-2"
                    style={
                      total(titik) === 0
                        ? undefined
                        : { backgroundColor: '#5fcbb0', opacity: skala(total(titik), maks) }
                    }
                  />
                ),
              )}
            </div>
          ))}
        </div>
      )}
      <p className="m-0 mt-3 flex items-center gap-2 font-mono text-[11px] tabular-nums text-paper-faint">
        Sepi
        <span className="inline-block h-3 w-3 rounded-[3px] bg-bg-raised-2" aria-hidden="true" />
        <span className="inline-block h-3 w-3 rounded-[3px] bg-signal/40" aria-hidden="true" />
        <span className="inline-block h-3 w-3 rounded-[3px] bg-signal" aria-hidden="true" />
        Ramai
      </p>
    </section>
  );
}
