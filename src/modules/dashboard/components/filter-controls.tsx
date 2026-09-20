'use client';

import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { View } from '@/modules/dashboard/components/dashboard-types';
import { presetRentang, type PresetRentang } from '@/modules/dashboard/components/shared/dashboard-dates';

export interface FilterControlsProps {
  readonly view: View;
  readonly data: unknown;
  readonly onApply: (query: string) => void;
}

interface ReferenceModel {
  readonly regions?: readonly { readonly id: string; readonly name: string }[];
  readonly sites?: readonly { readonly id: string; readonly normalizedHostname: string }[];
  readonly categories?: readonly { readonly id: string; readonly name: string }[];
  readonly publishers?: readonly { readonly id: string; readonly name: string }[];
  readonly authors?: readonly { readonly id: string; readonly displayName: string }[];
}

/**
 * Merender kontrol filter data.
 *
 * @remarks Analytics hanya punya filter rentang tanggal (from/to) sesuai analyticsFilterSchema.
 */
export function FilterControls({ view, data, onApply }: FilterControlsProps) {
  if (view !== 'editorial' && view !== 'audit' && view !== 'analytics') return null;

  const model = data as ReferenceModel | null;

  const handleApply = (form: HTMLFormElement) => {
    const params = new URLSearchParams();
    const formData = new FormData(form);

    for (const [key, value] of formData) {
      if (typeof value !== 'string' || value.trim().length === 0) continue;
      const cleanValue = value.trim();

      if (key === 'from' || key === 'to') {
        const parsedDate = new Date(cleanValue);
        if (!Number.isNaN(parsedDate.getTime())) {
          params.set(key, parsedDate.toISOString());
        }
      } else {
        params.set(key, cleanValue);
      }
    }

    const queryString = params.toString();
    onApply(queryString.length > 0 ? `&${queryString}` : '');
  };

  const handleReset = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const form = event.currentTarget.closest('form');
    if (form) form.reset();
    onApply('');
  };

  const terapkanPreset = (preset: PresetRentang) => {
    const rentang = presetRentang(preset);
    onApply(`&from=${encodeURIComponent(rentang.from)}&to=${encodeURIComponent(rentang.to)}`);
  };

  const PRESET: readonly { readonly kunci: PresetRentang; readonly label: string }[] = [
    { kunci: 'hari-ini', label: 'Hari ini' },
    { kunci: '7-hari', label: '7 hari' },
    { kunci: '30-hari', label: '30 hari' },
  ];

  return (
    <section aria-label={`Filter data untuk ${view}`} className="rounded-lg border border-hairline bg-bg-raised p-4 sm:p-5">
      <form
        aria-label={`Filter data untuk ${view}`}
        onSubmit={(event) => {
          event.preventDefault();
          handleApply(event.currentTarget);
        }}
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          {/* Kolom mengikuti jumlah field: editorial 4, audit 3, analytics 3 — tanpa slot kosong. */}
          <div className={view === 'audit' ? 'grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-3' : view === 'analytics' ? 'grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-3' : 'grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4'}>
          {view === 'editorial' ? (
            <>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="filter-region" className="font-sans text-xs font-medium text-paper-dim">
                  Wilayah
                </label>
                <select
                  id="filter-region"
                  name="regionId"
                  className="h-9 border border-hairline-strong bg-bg px-2 font-sans text-xs text-paper transition-colors duration-180 hover:border-paper-faint focus:border-brass focus:outline-none"
                >
                  <option value="">Semua wilayah</option>
                  {model?.regions?.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="filter-site" className="font-sans text-xs font-medium text-paper-dim">
                  Situs
                </label>
                <select
                  id="filter-site"
                  name="siteId"
                  className="h-9 border border-hairline-strong bg-bg px-2 font-sans text-xs text-paper transition-colors duration-180 hover:border-paper-faint focus:border-brass focus:outline-none"
                >
                  <option value="">Semua situs</option>
                  {model?.sites?.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.normalizedHostname}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="filter-category" className="font-sans text-xs font-medium text-paper-dim">
                  Kategori
                </label>
                <select
                  id="filter-category"
                  name="categoryId"
                  className="h-9 border border-hairline-strong bg-bg px-2 font-sans text-xs text-paper transition-colors duration-180 hover:border-paper-faint focus:border-brass focus:outline-none"
                >
                  <option value="">Semua kategori</option>
                  {model?.categories?.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="filter-search" className="font-sans text-xs font-medium text-paper-dim">
                  Cari judul
                </label>
                <Input
                  id="filter-search"
                  name="search"
                  placeholder="Ketik judul…"
                  className="h-9 border-hairline-strong bg-bg px-2 font-sans text-xs text-paper transition-colors duration-180 hover:border-paper-faint focus-visible:ring-brass"
                />
              </div>
            </>
          ) : null}

          {view === 'audit' ? (
            <>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="filter-actor" className="font-sans text-xs font-medium text-paper-dim">
                  Pelaku (ID)
                </label>
                <Input
                  id="filter-actor"
                  name="actorId"
                  placeholder="ID pelaku…"
                  className="h-9 border-hairline-strong bg-bg px-2 font-sans text-xs text-paper transition-colors duration-180 hover:border-paper-faint focus-visible:ring-brass"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="filter-action" className="font-sans text-xs font-medium text-paper-dim">
                  Jenis Aksi
                </label>
                <Input
                  id="filter-action"
                  name="action"
                  placeholder="contoh: article.create"
                  className="h-9 border-hairline-strong bg-bg px-2 font-sans text-xs text-paper transition-colors duration-180 hover:border-paper-faint focus-visible:ring-brass"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="filter-outcome" className="font-sans text-xs font-medium text-paper-dim">
                  Hasil
                </label>
                <select
                  id="filter-outcome"
                  name="outcome"
                  className="h-9 border border-hairline-strong bg-bg px-2 font-sans text-xs text-paper transition-colors duration-180 hover:border-paper-faint focus:border-brass focus:outline-none"
                >
                  <option value="">Semua hasil</option>
                  <option value="succeeded">Berhasil</option>
                  <option value="denied">Ditolak</option>
                  <option value="failed">Gagal</option>
                </select>
              </div>
            </>
          ) : null}

          {view === 'analytics' ? (
            <>
              <div className="flex flex-col gap-1.5">
                <span id="filter-preset-label" className="font-sans text-xs font-medium text-paper-dim">
                  Rentang cepat
                </span>
                <div role="group" aria-labelledby="filter-preset-label" className="flex h-9 items-center gap-1.5">
                  {PRESET.map(({ kunci, label }) => (
                    <button
                      key={kunci}
                      type="button"
                      onClick={() => terapkanPreset(kunci)}
                      className="inline-flex h-7 items-center rounded border border-hairline px-2 font-sans text-[11px] text-paper-dim transition-colors duration-180 hover:border-hairline-strong hover:text-paper focus:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="filter-from" className="font-sans text-xs font-medium text-paper-dim">
                  Dari tanggal
                </label>
                <Input
                  id="filter-from"
                  name="from"
                  type="date"
                  className="h-9 border-hairline-strong bg-bg px-2 font-sans text-xs text-paper transition-colors duration-180 hover:border-paper-faint focus-visible:ring-brass"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="filter-to" className="font-sans text-xs font-medium text-paper-dim">
                  Sampai tanggal
                </label>
                <Input
                  id="filter-to"
                  name="to"
                  type="date"
                  className="h-9 border-hairline-strong bg-bg px-2 font-sans text-xs text-paper transition-colors duration-180 hover:border-paper-faint focus-visible:ring-brass"
                />
              </div>
            </>
          ) : null}
          </div>
          <div className="flex flex-none items-center gap-2">
            <button
              type="submit"
              className="inline-flex h-9 items-center gap-1.5 bg-brass px-4 font-sans text-xs font-semibold text-bg transition-colors duration-180 hover:bg-brass-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            >
              <Search className="h-3 w-3" aria-hidden="true" />
              <span>Terapkan</span>
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex h-9 items-center gap-1.5 border border-hairline px-3 font-sans text-xs text-paper-dim transition-colors duration-180 hover:border-hairline-strong hover:text-paper focus:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
              aria-label="Bersihkan filter"
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}