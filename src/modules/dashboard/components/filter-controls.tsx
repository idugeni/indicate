'use client';

import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
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
          <div className={view === 'audit' ? 'grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-3' : view === 'analytics' ? 'grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-3' : 'grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4'}>
          {view === 'editorial' ? (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="filter-region" className="font-sans text-xs font-medium text-paper-dim">
                  Wilayah
                </Label>
                <NativeSelect
                  id="filter-region"
                  name="regionId"
                  className="w-full"
                >
                  <NativeSelectOption value="">Semua wilayah</NativeSelectOption>
                  {model?.regions?.map((item) => (
                    <NativeSelectOption key={item.id} value={item.id}>
                      {item.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="filter-site" className="font-sans text-xs font-medium text-paper-dim">
                  Situs
                </Label>
                <NativeSelect
                  id="filter-site"
                  name="siteId"
                  className="w-full"
                >
                  <NativeSelectOption value="">Semua situs</NativeSelectOption>
                  {model?.sites?.map((item) => (
                    <NativeSelectOption key={item.id} value={item.id}>
                      {item.normalizedHostname}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="filter-category" className="font-sans text-xs font-medium text-paper-dim">
                  Kategori
                </Label>
                <NativeSelect
                  id="filter-category"
                  name="categoryId"
                  className="w-full"
                >
                  <NativeSelectOption value="">Semua kategori</NativeSelectOption>
                  {model?.categories?.map((item) => (
                    <NativeSelectOption key={item.id} value={item.id}>
                      {item.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="filter-search" className="font-sans text-xs font-medium text-paper-dim">
                  Cari judul
                </Label>
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
                <Label htmlFor="filter-actor" className="font-sans text-xs font-medium text-paper-dim">
                  Pelaku (ID)
                </Label>
                <Input
                  id="filter-actor"
                  name="actorId"
                  placeholder="ID pelaku…"
                  className="h-9 border-hairline-strong bg-bg px-2 font-sans text-xs text-paper transition-colors duration-180 hover:border-paper-faint focus-visible:ring-brass"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="filter-action" className="font-sans text-xs font-medium text-paper-dim">
                  Jenis Aksi
                </Label>
                <Input
                  id="filter-action"
                  name="action"
                  placeholder="contoh: article.create"
                  className="h-9 border-hairline-strong bg-bg px-2 font-sans text-xs text-paper transition-colors duration-180 hover:border-paper-faint focus-visible:ring-brass"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="filter-outcome" className="font-sans text-xs font-medium text-paper-dim">
                  Hasil
                </Label>
                <NativeSelect
                  id="filter-outcome"
                  name="outcome"
                  className="w-full"
                >
                  <NativeSelectOption value="">Semua hasil</NativeSelectOption>
                  <NativeSelectOption value="succeeded">Berhasil</NativeSelectOption>
                  <NativeSelectOption value="denied">Ditolak</NativeSelectOption>
                  <NativeSelectOption value="failed">Gagal</NativeSelectOption>
                </NativeSelect>
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
                    <Button
                      key={kunci}
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={() => terapkanPreset(kunci)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="filter-from" className="font-sans text-xs font-medium text-paper-dim">
                  Dari tanggal
                </Label>
                <Input
                  id="filter-from"
                  name="from"
                  type="date"
                  className="h-9 border-hairline-strong bg-bg px-2 font-sans text-xs text-paper transition-colors duration-180 hover:border-paper-faint focus-visible:ring-brass"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="filter-to" className="font-sans text-xs font-medium text-paper-dim">
                  Sampai tanggal
                </Label>
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
            <Button
              type="submit"
              variant="default"
              size="lg"
            >
              <Search className="h-3 w-3" aria-hidden="true" />
              <span>Terapkan</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={handleReset}
              aria-label="Bersihkan filter"
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </form>
    </section>
  );
}