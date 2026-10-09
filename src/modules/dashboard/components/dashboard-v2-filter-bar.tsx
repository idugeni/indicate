'use client';

import { useId, useMemo, useState, type FormEvent } from 'react';
import {
  Calendar as CalendarIcon,
  Database,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DashboardSelect, DashboardSelectItem } from '@/modules/dashboard/components/shared/dashboard-select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { View } from '@/modules/dashboard/components/dashboard-types';
import { presetRange, type RangePreset } from '@/modules/dashboard/components/shared/dashboard-dates';

export interface DashboardV2FilterBarProps {
  readonly view: View;
  readonly data: unknown;
  readonly onApply: (query: string) => void;
}

interface ReferenceModel {
  readonly regions?: readonly { readonly id: string; readonly name: string }[];
  readonly sites?: readonly { readonly id: string; readonly normalizedHostname: string }[];
  readonly categories?: readonly { readonly id: string; readonly name: string }[];
  readonly authors?: readonly { readonly id: string; readonly displayName: string }[];
  readonly siteTotal?: number;
  readonly siteTotalInScope?: number;
  readonly siteSearch?: string | null;
}

function configurationCountNote(model: ReferenceModel | null): string | null {
  if (model === null || model.sites === undefined) return null;
  const listed = model.sites.length;
  const matched = model.siteTotal ?? listed;
  const inScope = model.siteTotalInScope ?? matched;
  const search = model.siteSearch ?? null;
  const head =
    search === null
      ? `Menampilkan ${listed.toLocaleString('id-ID')} dari ${inScope.toLocaleString('id-ID')} portal`
      : `Pencarian “${search}” · ${matched.toLocaleString('id-ID')} dari ${inScope.toLocaleString('id-ID')} portal`;
  return matched > listed ? `${head} · gunakan pencarian untuk membuka sisanya.` : head;
}

function isoDayStart(date: Date): string {
  return new Date(format(date, 'yyyy-MM-dd')).toISOString();
}

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
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <Label htmlFor={id} className="font-mono text-xs uppercase tracking-wider text-paper-dim">
        {label}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              id={id}
              type="button"
              variant="outline"
              className="h-9 w-full justify-start gap-2 rounded-md border-hairline-strong bg-bg px-2.5 font-sans text-xs font-normal text-paper transition-colors duration-150 hover:border-hairline focus-visible:ring-1 focus-visible:ring-brass"
            >
              <CalendarIcon className="h-3.5 w-3.5 flex-none text-paper-dim" aria-hidden="true" />
              <span className="truncate">
                {value === undefined
                  ? 'Pilih tanggal'
                  : format(value, 'd MMM yyyy', { locale: localeId })}
              </span>
            </Button>
          }
        />
        <PopoverContent align="start" className="w-auto p-0 border-hairline bg-bg">
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

const PRESET_OPTIONS: readonly { readonly key: RangePreset; readonly label: string }[] = [
  { key: 'today', label: 'Hari Ini' },
  { key: '7-days', label: '7 Hari Terakhir' },
  { key: '30-days', label: '30 Hari Terakhir' },
];

export function DashboardV2FilterBar({ view, data, onApply }: DashboardV2FilterBarProps) {
  const portalInputId = useId();
  const actorInputId = useId();
  const actionInputId = useId();
  const outcomeInputId = useId();

  const [searchTerm, setSearchTerm] = useState('');
  const [actorId, setActorId] = useState('');
  const [action, setAction] = useState('');
  const [outcome, setOutcome] = useState('');

  const [preset, setPreset] = useState<string[]>([]);
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);

  const model = data as ReferenceModel | null;
  const portalCount = view === 'configuration' ? configurationCountNote(model) : null;
  const countNote = portalCount;

  const activeFilterCount = useMemo(() => {
    if (view === 'analytics') {
      return (fromDate !== undefined ? 1 : 0) + (toDate !== undefined ? 1 : 0);
    }
    if (view === 'configuration') {
      return searchTerm.trim() !== '' ? 1 : 0;
    }
    if (view === 'audit') {
      return (
        (actorId.trim() !== '' ? 1 : 0) +
        (action.trim() !== '' ? 1 : 0) +
        (outcome !== '' ? 1 : 0)
      );
    }
    return 0;
  }, [view, fromDate, toDate, searchTerm, actorId, action, outcome]);

  const applyRangeQuery = (start: Date | undefined, end: Date | undefined) => {
    const params = new URLSearchParams();
    if (start !== undefined) params.set('from', isoDayStart(start));
    if (end !== undefined) params.set('to', isoDayStart(end));
    const queryString = params.toString();
    onApply(queryString.length > 0 ? `&${queryString}` : '');
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (view === 'analytics') {
      applyRangeQuery(fromDate, toDate);
      return;
    }

    const params = new URLSearchParams();

    if (view === 'configuration') {
      const cleanSearch = searchTerm.trim();
      if (cleanSearch !== '') params.set('search', cleanSearch);
    } else if (view === 'audit') {
      const cleanActor = actorId.trim();
      const cleanAction = action.trim();
      if (cleanActor !== '') params.set('actorId', cleanActor);
      if (cleanAction !== '') params.set('action', cleanAction);
      if (outcome !== '') params.set('outcome', outcome);
    }

    const queryString = params.toString();
    onApply(queryString.length > 0 ? `&${queryString}` : '');
  };

  const handleReset = () => {
    setSearchTerm('');
    setActorId('');
    setAction('');
    setOutcome('');
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

  return (
    <section
      aria-label={`Filter data untuk ${view}`}
      className="flex flex-col gap-3 rounded-lg border border-hairline bg-bg-raised p-3.5 transition-shadow duration-150"
    >
      <div className="flex items-center justify-between border-b border-hairline/60 pb-2.5">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-3.5 w-3.5 text-brass" aria-hidden="true" />
          <span className="font-mono text-xs uppercase tracking-wider text-paper">
            Filter Tampilan
          </span>
        </div>
        {activeFilterCount > 0 ? (
          <span className="rounded-full border border-brass/30 bg-brass/10 px-2 py-0.5 font-mono text-[10px] text-brass">
            {activeFilterCount} kriteria aktif
          </span>
        ) : (
          <span className="font-mono text-[10px] text-paper-dim">Standar</span>
        )}
      </div>

      <form
        noValidate
        aria-label={`Form filter data untuk ${view}`}
        onSubmit={handleSubmit}
        className="flex flex-col gap-3"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          {view === 'configuration' ? (
            <div className="flex flex-1 min-w-0 flex-col gap-1.5">
              <Label
                htmlFor={portalInputId}
                className="font-mono text-xs uppercase tracking-wider text-paper-dim"
              >
                Pencarian Portal
              </Label>
              <div className="relative flex items-center">
                <Search className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-paper-dim" />
                <Input
                  id={portalInputId}
                  name="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Cari hostname portal (mis. wonosobo.domainanda.id)..."
                  className="h-9 rounded-md border-hairline-strong bg-bg pl-9 pr-8 font-mono text-xs text-paper placeholder:font-sans placeholder:text-paper-dim/50 hover:border-hairline focus-visible:ring-1 focus-visible:ring-brass"
                />
                {searchTerm !== '' && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 rounded p-0.5 text-paper-dim hover:text-paper"
                    aria-label="Bersihkan pencarian"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          ) : null}

          {view === 'audit' ? (
            <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor={actorInputId}
                  className="font-mono text-xs uppercase tracking-wider text-paper-dim"
                >
                  ID Pelaku
                </Label>
                <Input
                  id={actorInputId}
                  name="actorId"
                  value={actorId}
                  onChange={(event) => setActorId(event.target.value)}
                  placeholder="ID pengguna..."
                  className="h-9 rounded-md border-hairline-strong bg-bg px-3 font-mono text-xs text-paper placeholder:text-paper-dim/50 hover:border-hairline focus-visible:ring-1 focus-visible:ring-brass"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor={actionInputId}
                  className="font-mono text-xs uppercase tracking-wider text-paper-dim"
                >
                  Tipe Aksi
                </Label>
                <Input
                  id={actionInputId}
                  name="action"
                  value={action}
                  onChange={(event) => setAction(event.target.value)}
                  placeholder="cth: article.create"
                  className="h-9 rounded-md border-hairline-strong bg-bg px-3 font-mono text-xs text-paper placeholder:text-paper-dim/50 hover:border-hairline focus-visible:ring-1 focus-visible:ring-brass"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor={outcomeInputId}
                  className="font-mono text-xs uppercase tracking-wider text-paper-dim"
                >
                  Status Eksekusi
                </Label>
                <DashboardSelect
                  id={outcomeInputId}
                  name="outcome"
                  value={outcome}
                  defaultValue=""
                  placeholder="Semua hasil"
                  onValueChange={(val) => setOutcome(val ?? '')}
                >
                  <DashboardSelectItem value="">Semua Status</DashboardSelectItem>
                  <DashboardSelectItem value="succeeded">Berhasil (Succeeded)</DashboardSelectItem>
                  <DashboardSelectItem value="denied">Ditolak (Denied)</DashboardSelectItem>
                  <DashboardSelectItem value="failed">Gagal (Failed)</DashboardSelectItem>
                </DashboardSelect>
              </div>
            </div>
          ) : null}

          {view === 'analytics' ? (
            <div className="flex flex-1 flex-col gap-3 lg:flex-row lg:items-end">
              <div className="flex min-w-[240px] flex-col gap-1.5">
                <span
                  id="filter-preset-label"
                  className="font-mono text-xs uppercase tracking-wider text-paper-dim"
                >
                  Rentang Cepat
                </span>
                <ToggleGroup
                  variant="outline"
                  size="sm"
                  spacing={1}
                  value={preset}
                  onValueChange={handlePresetSelect}
                  aria-labelledby="filter-preset-label"
                  className="w-full justify-start"
                >
                  {PRESET_OPTIONS.map(({ key, label }) => (
                    <ToggleGroupItem
                      key={key}
                      value={key}
                      aria-label={label}
                      className="flex-1 font-mono text-[11px] data-[state=on]:border-brass data-[state=on]:bg-brass/10 data-[state=on]:text-brass"
                    >
                      {label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
              <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
                <DatePicker
                  id="filter-from"
                  label="Dari Tanggal"
                  value={fromDate}
                  onChange={handleDateSelect(setFromDate)}
                />
                <DatePicker
                  id="filter-to"
                  label="Sampai Tanggal"
                  value={toDate}
                  onChange={handleDateSelect(setToDate)}
                />
              </div>
            </div>
          ) : null}

          <div className="flex shrink-0 items-center gap-2 pt-1 lg:pt-0">
            <Button
              type="submit"
              size="sm"
              className="h-9 min-w-[100px] gap-2 rounded-md font-sans text-xs font-medium"
            >
              <Search className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Terapkan</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={activeFilterCount === 0}
              aria-label="Bersihkan seluruh filter"
              className="h-9 gap-1.5 rounded-md border-hairline-strong px-2.5 font-sans text-xs hover:border-hairline disabled:opacity-40"
            >
              <RotateCcw className="h-3.5 w-3.5 text-paper-dim" aria-hidden="true" />
              <span className="hidden sm:inline">Reset</span>
            </Button>
          </div>
        </div>
      </form>

      {countNote !== null && (
        <div className="flex items-center gap-2 rounded border border-hairline/60 bg-bg/50 px-2.5 py-1.5">
          <Database className="h-3 w-3 shrink-0 text-paper-dim" aria-hidden="true" />
          <p className="m-0 font-mono text-[11px] tabular-nums text-paper-faint">
            {countNote}
          </p>
        </div>
      )}
    </section>
  );
}