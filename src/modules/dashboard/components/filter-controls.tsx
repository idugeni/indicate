'use client';

import { useState } from 'react';
import { Calendar as CalendarIcon, Search, X } from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DashboardSelect, DashboardSelectItem } from '@/modules/dashboard/components/shared/dashboard-select';
import { SearchCombobox } from '@/modules/dashboard/components/shared/search-combobox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { View } from '@/modules/dashboard/components/dashboard-types';
import { presetRange, type RangePreset } from '@/modules/dashboard/components/shared/dashboard-dates';

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
  readonly siteTotal?: number;
  readonly siteTotalInScope?: number;
  readonly siteSearch?: string | null;
}

/**
 * State how many portals the configuration listing actually returned.
 *
 * @param model - Configuration payload, or null before the first response.
 * @returns Indonesian count line naming the search term when one is active.
 */
function configurationCountNote(model: ReferenceModel | null): string | null {
  if (model === null || model.sites === undefined) return null;
  const listed = model.sites.length;
  const matched = model.siteTotal ?? listed;
  const inScope = model.siteTotalInScope ?? matched;
  const search = model.siteSearch ?? null;
  const head = search === null
    ? `Menampilkan ${listed.toLocaleString('id-ID')} dari ${inScope.toLocaleString('id-ID')} portal`
    : `Pencarian “${search}” · ${matched.toLocaleString('id-ID')} dari ${inScope.toLocaleString('id-ID')} portal`;
  return matched > listed ? `${head} · gunakan pencarian untuk membuka sisanya.` : head;
}

/**
 * Align a picked date with native date-input semantics: midnight UTC.
 *
 * @param date - Local date from the calendar.
 * @returns ISO UTC start of that day, ready to send as `from`/`to`.
 */
function isoDayStart(date: Date): string {
  return new Date(format(date, 'yyyy-MM-dd')).toISOString();
}

/**
 * Render a popover date picker for analytics filters.
 *
 * @param id - Trigger ID so the label associates for accessibility and tests.
 * @param label - Field label text.
 * @param value - Selected date, or undefined when empty.
 * @param onChange - Called with the new date; undefined when cleared.
 * @returns Date field with a shadcn calendar in a popover.
 */
function DatePicker({
  id,
  label,
  value,
  onChange,
}: {
  readonly id: string;
  readonly label: string;
  readonly value: Date | undefined;
  readonly onChange: (next: Date | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={id} className="font-sans text-xs font-medium text-paper-dim">
        {label}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              id={id}
              type="button"
              variant="outline"
              className="h-9 w-full justify-start gap-2 border-hairline-strong bg-bg px-2.5 font-sans text-xs font-normal text-paper hover:border-paper-faint"
            >
              <CalendarIcon className="h-3.5 w-3.5 flex-none text-paper-faint" aria-hidden="true" />
              <span className="truncate">
                {value === undefined ? 'Pilih tanggal' : format(value, 'd MMM yyyy', { locale: localeId })}
              </span>
            </Button>
          }
        />
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="single"
            selected={value}
            onSelect={(date) => {
              onChange(date);
              setOpen(false);
            }}
            locale={localeId}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

/**
 * Render data filter controls.
 *
 * @remarks Analytics only has date-range filters (from/to) per analyticsFilterSchema;
 * the configuration view filters the portal listing by hostname or site name.
 */
export function FilterControls({ view, data, onApply }: FilterControlsProps) {
  const [preset, setPreset] = useState<string[]>([]);
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);

  if (view !== 'editorial' && view !== 'audit' && view !== 'analytics' && view !== 'configuration') return null;

  const model = data as ReferenceModel | null;
  const portalCount = view === 'configuration' ? configurationCountNote(model) : null;

  const applyRange = (start: Date | undefined, end: Date | undefined) => {
    const params = new URLSearchParams();
    if (start !== undefined) params.set('from', isoDayStart(start));
    if (end !== undefined) params.set('to', isoDayStart(end));
    const queryString = params.toString();
    onApply(queryString.length > 0 ? `&${queryString}` : '');
  };

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
    setPreset([]);
    setFromDate(undefined);
    setToDate(undefined);
    onApply('');
  };

  const applyPreset = (key: RangePreset) => {
    const range = presetRange(key);
    setPreset([key]);
    setFromDate(new Date(range.from));
    setToDate(new Date(range.to));
    onApply(`&from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`);
  };

  const handlePresetSelect = (values: string[]) => {
    const key = values[values.length - 1];
    if (key === 'today' || key === '7-days' || key === '30-days') {
      applyPreset(key);
      return;
    }
    setPreset([]);
  };

  const handleDateSelect = (setter: (next: Date | undefined) => void) => (next: Date | undefined) => {
    setPreset([]);
    setter(next);
  };

  const PRESET: readonly { readonly key: RangePreset; readonly label: string }[] = [
    { key: 'today', label: 'Hari ini' },
    { key: '7-days', label: '7 hari' },
    { key: '30-days', label: '30 hari' },
  ];

  return (
    <section aria-label={`Filter data untuk ${view}`} className="rounded-lg border border-hairline bg-bg-raised p-4 sm:p-5">
      <form
        noValidate
        aria-label={`Filter data untuk ${view}`}
        onSubmit={(event) => {
          event.preventDefault();
          if (view === 'analytics') {
            applyRange(fromDate, toDate);
            return;
          }
          handleApply(event.currentTarget);
        }}
      >
        <div className={view === 'editorial' ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto]' : view === 'analytics' ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_auto]' : view === 'configuration' ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_auto]' : 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[repeat(3,minmax(0,1fr))_auto]'}>
          {view === 'editorial' ? (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="filter-region" className="font-sans text-xs font-medium text-paper-dim">
                  Wilayah
                </Label>
                <SearchCombobox
                  id="filter-region"
                  name="regionId"
                  placeholder="Semua wilayah"
                  allowEmpty
                  emptyLabel="Semua wilayah"
                  options={(model?.regions ?? []).map((item) => ({ value: item.id, label: item.name }))}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="filter-site" className="font-sans text-xs font-medium text-paper-dim">
                  Situs
                </Label>
                <SearchCombobox
                  id="filter-site"
                  name="siteId"
                  placeholder="Semua situs"
                  allowEmpty
                  emptyLabel="Semua situs"
                  options={(model?.sites ?? []).map((item) => ({ value: item.id, label: item.normalizedHostname }))}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="filter-category" className="font-sans text-xs font-medium text-paper-dim">
                  Kategori
                </Label>
                <SearchCombobox
                  id="filter-category"
                  name="categoryId"
                  placeholder="Semua kategori"
                  allowEmpty
                  emptyLabel="Semua kategori"
                  options={(model?.categories ?? []).map((item) => ({ value: item.id, label: item.name }))}
                />
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

          {view === 'configuration' ? (
            <div className="flex min-w-0 flex-col gap-1.5">
              <Label htmlFor="filter-portal" className="font-sans text-xs font-medium text-paper-dim">
                Cari portal
              </Label>
              <Input
                id="filter-portal"
                name="search"
                placeholder="mis. semarang.domainanda.id"
                className="h-9 border-hairline-strong bg-bg px-2 font-mono text-xs text-paper transition-colors duration-180 hover:border-paper-faint focus-visible:ring-brass"
              />
            </div>
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
                <DashboardSelect
                  id="filter-outcome"
                  name="outcome"
                  placeholder="Semua hasil"
                >
                  <DashboardSelectItem value="">Semua hasil</DashboardSelectItem>
                  <DashboardSelectItem value="succeeded">Berhasil</DashboardSelectItem>
                  <DashboardSelectItem value="denied">Ditolak</DashboardSelectItem>
                  <DashboardSelectItem value="failed">Gagal</DashboardSelectItem>
                </DashboardSelect>
              </div>
            </>
          ) : null}

          {view === 'analytics' ? (
            <>
              <div className="flex min-w-0 flex-col gap-1.5 sm:col-span-2 lg:col-span-1">
                <span id="filter-preset-label" className="font-sans text-xs font-medium text-paper-dim">
                  Rentang cepat
                </span>
                <ToggleGroup
                  variant="outline"
                  size="lg"
                  spacing={1}
                  value={preset}
                  onValueChange={handlePresetSelect}
                  aria-labelledby="filter-preset-label"
                  className="w-full flex-wrap justify-start"
                >
                  {PRESET.map(({ key, label }) => (
                    <ToggleGroupItem key={key} value={key} aria-label={label} className="flex-1 font-sans text-xs">
                      {label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
              <DatePicker id="filter-from" label="Dari tanggal" value={fromDate} onChange={handleDateSelect(setFromDate)} />
              <DatePicker id="filter-to" label="Sampai tanggal" value={toDate} onChange={handleDateSelect(setToDate)} />
            </>
          ) : null}
          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-1">
            <Button
              type="submit"
              variant="default"
              size="lg"
              className="flex-1 lg:flex-none"
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
              className="flex-1 lg:flex-none"
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </form>
      {portalCount === null ? null : (
        <p className="m-0 mt-3 font-mono text-[11px] tabular-nums text-paper-faint">{portalCount}</p>
      )}
    </section>
  );
}