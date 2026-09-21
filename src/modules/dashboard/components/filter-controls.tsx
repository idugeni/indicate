'use client';

import { useState } from 'react';
import { Calendar as CalendarIcon, Search, X } from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
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
 * @remarks Analytics only has date-range filters (from/to) per analyticsFilterSchema.
 */
export function FilterControls({ view, data, onApply }: FilterControlsProps) {
  const [preset, setPreset] = useState<string[]>([]);
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);

  if (view !== 'editorial' && view !== 'audit' && view !== 'analytics') return null;

  const model = data as ReferenceModel | null;

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
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className={view === 'audit' ? 'grid flex-1 gap-4 sm:grid-cols-2 lg:grid-cols-3' : view === 'analytics' ? 'grid flex-1 gap-4 sm:grid-cols-2 xl:grid-cols-3' : 'grid flex-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'}>
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
              <div className="flex min-w-0 flex-col gap-1.5 sm:col-span-2 xl:col-span-1">
                <span id="filter-preset-label" className="font-sans text-xs font-medium text-paper-dim">
                  Rentang cepat
                </span>
                <ToggleGroup
                  variant="outline"
                  size="sm"
                  spacing={1}
                  value={preset}
                  onValueChange={handlePresetSelect}
                  aria-labelledby="filter-preset-label"
                  className="flex-wrap justify-start"
                >
                  {PRESET.map(({ key, label }) => (
                    <ToggleGroupItem key={key} value={key} aria-label={label} className="font-sans text-xs">
                      {label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
              <DatePicker id="filter-from" label="Dari tanggal" value={fromDate} onChange={handleDateSelect(setFromDate)} />
              <DatePicker id="filter-to" label="Sampai tanggal" value={toDate} onChange={handleDateSelect(setToDate)} />
            </>
          ) : null}
          </div>
          <div className="flex w-full flex-none items-center gap-2 sm:w-auto">
            <Button
              type="submit"
              variant="default"
              size="lg"
              className="flex-1 sm:flex-none"
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
              className="flex-1 sm:flex-none"
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </form>
    </section>
  );
}