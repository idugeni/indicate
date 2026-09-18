'use client';

import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { View } from '@/modules/dashboard/components/dashboard-types';

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
 * @remarks Analytics tidak punya field filter: jangan render card kosong.
 */
export function FilterControls({ view, data, onApply }: FilterControlsProps) {
  if (view !== 'editorial' && view !== 'audit') return null;

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
          {/* Kolom mengikuti jumlah field: editorial 4, audit 3 — tanpa slot kosong. */}
          <div className={view === 'audit' ? 'grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-3' : 'grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4'}>
          {view === 'editorial' ? (
            <>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="filter-region" className="font-sans text-xs font-medium text-paper-dim">
                  Wilayah regional
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
                  Kanal (site)
                </label>
                <select
                  id="filter-site"
                  name="siteId"
                  className="h-9 border border-hairline-strong bg-bg px-2 font-sans text-xs text-paper transition-colors duration-180 hover:border-paper-faint focus:border-brass focus:outline-none"
                >
                  <option value="">Semua kanal</option>
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
                  Cari judul / slug
                </label>
                <Input
                  id="filter-search"
                  name="search"
                  placeholder="Query judul atau slug…"
                  className="h-9 border-hairline-strong bg-bg px-2 font-sans text-xs text-paper transition-colors duration-180 hover:border-paper-faint focus-visible:ring-brass"
                />
              </div>
            </>
          ) : null}

          {view === 'audit' ? (
            <>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="filter-actor" className="font-sans text-xs font-medium text-paper-dim">
                  Aktor (ID)
                </label>
                <Input
                  id="filter-actor"
                  name="actorId"
                  placeholder="ID entitas aktor…"
                  className="h-9 border-hairline-strong bg-bg px-2 font-sans text-xs text-paper transition-colors duration-180 hover:border-paper-faint focus-visible:ring-brass"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="filter-action" className="font-sans text-xs font-medium text-paper-dim">
                  Tipe aksi
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
                  Hasil transaksi
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