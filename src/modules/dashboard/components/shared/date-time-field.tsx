'use client';

import { useState } from 'react';
import { format, addMonths, isAfter, isBefore, startOfMonth } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type DateTimeMode = 'past' | 'future' | 'any';

interface DateParts {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
}

/**
 * Mengurai nilai `YYYY-MM-DDTHH:mm` menjadi bagian tanggal dan jam.
 *
 * @param value - Nilai mentah dari induk formulir.
 * @returns Bagian tanggal-jam atau null bila kosong atau tidak valid.
 */
export function parseDateTimeValue(value: string): DateParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value.trim());
  if (match === null) return null;
  const parts = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
  };
  if (parts.month < 1 || parts.month > 12 || parts.day < 1 || parts.day > 31 || parts.hour > 23 || parts.minute > 59) {
    return null;
  }
  const probe = new Date(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
  if (probe.getFullYear() !== parts.year || probe.getMonth() !== parts.month - 1 || probe.getDate() !== parts.day) {
    return null;
  }
  return parts;
}

const pad = (part: number): string => String(part).padStart(2, '0');

/**
 * Merakit nilai `YYYY-MM-DDTHH:mm` dari bagian tanggal dan jam.
 *
 * @param parts - Bagian tanggal dan jam yang valid.
 * @returns Nilai siap kirim ke `localDateTimeToIso`.
 */
export function formatDateTimeValue(parts: DateParts): string {
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
}

const HOURS = Array.from({ length: 24 }, (slot, hour) => {
  void slot;
  return hour;
});
const MINUTES = Array.from({ length: 60 }, (slot, minute) => {
  void slot;
  return minute;
});

const NAV_START = (() => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 10, 0, 1);
  date.setHours(0, 0, 0, 0);
  return date;
})();

const NAV_END = (() => {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 5, 11, 31);
  date.setHours(23, 59, 59, 0);
  return date;
})();

interface Shortcut {
  readonly label: string;
  readonly daysFromToday: number;
  readonly direction: 'past' | 'future' | 'any';
}

const SHORTCUTS: readonly Shortcut[] = [
  { label: 'Hari ini', daysFromToday: 0, direction: 'any' },
  { label: 'Kemarin', daysFromToday: -1, direction: 'past' },
  { label: '7 hari lalu', daysFromToday: -7, direction: 'past' },
  { label: 'Besok', daysFromToday: 1, direction: 'future' },
];

/**
 * Memilih tanggal lewat kalender shadcn dan jam lewat dropdown.
 *
 * @param value - Nilai `YYYY-MM-DDTHH:mm` atau string kosong.
 * @param onChange - Menerima nilai baru atau string kosong saat dihapus.
 * @param disabled - Menonaktifkan seluruh kontrol.
 * @param ariaLabel - Label aksesibel pemicu.
 * @param mode - Batasan arah tanggal: masa lalu, masa depan, atau bebas.
 * @returns Kombinasi popover kalender, pintasan cepat, dan dropdown jam.
 */
export function DateTimeField({
  value,
  onChange,
  disabled = false,
  ariaLabel,
  mode = 'any',
}: {
  readonly value: string;
  readonly onChange: (next: string) => void;
  readonly disabled?: boolean;
  readonly ariaLabel: string;
  readonly mode?: DateTimeMode;
}) {
  const [open, setOpen] = useState(false);
  const parsed = parseDateTimeValue(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [viewMonth, setViewMonth] = useState<Date>(() => startOfMonth(new Date()));
  const openPicker = (next: boolean): void => {
    if (next) {
      const base = parsed === null ? new Date() : new Date(parsed.year, parsed.month - 1, 1);
      setViewMonth(startOfMonth(base));
    }
    setOpen(next);
  };
  const canPrev = !isBefore(startOfMonth(viewMonth), startOfMonth(addMonths(NAV_START, 1)));
  const canNext = !isAfter(startOfMonth(viewMonth), startOfMonth(addMonths(NAV_END, -1)));

  const emit = (next: DateParts | null): void => {
    onChange(next === null ? '' : formatDateTimeValue(next));
  };

  const pickDate = (date: Date | undefined): void => {
    if (date === undefined) return;
    const current = parsed ?? { hour: 0, minute: 0 };
    emit({ year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate(), hour: current.hour, minute: current.minute });
  };

  const pickShortcut = (daysFromToday: number): void => {
    const base = new Date();
    base.setDate(base.getDate() + daysFromToday);
    emit({ year: base.getFullYear(), month: base.getMonth() + 1, day: base.getDate(), hour: base.getHours(), minute: base.getMinutes() });
  };

  const todayParts = (): Pick<DateParts, 'year' | 'month' | 'day'> => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
  };

  const pickTime = (part: 'hour' | 'minute', raw: string): void => {
    const amount = Number(raw);
    if (!Number.isInteger(amount)) return;
    const current = parsed ?? { ...todayParts(), hour: 0, minute: 0 };
    emit(part === 'hour' ? { ...current, hour: amount } : { ...current, minute: amount });
  };

  const selectedDate =
    parsed === null ? undefined : new Date(parsed.year, parsed.month - 1, parsed.day);
  const shortcutDisabled = (direction: Shortcut['direction']): boolean =>
    disabled || (mode !== 'any' && direction !== 'any' && direction !== mode);

  return (
    <div className="flex items-center gap-1.5">
      <Popover open={open} onOpenChange={openPicker}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              aria-label={ariaLabel}
              className="h-8 font-mono text-xs"
            >
              <CalendarDays className="h-3.5 w-3.5 text-brass" aria-hidden="true" />
              <span>
                {parsed === null
                  ? 'Pilih tanggal'
                  : format(new Date(parsed.year, parsed.month - 1, parsed.day, parsed.hour, parsed.minute), 'd MMM yyyy, HH:mm', { locale: idLocale })}
              </span>
            </Button>
          }
        />
        <PopoverContent align="start" className="dtf-calendar w-auto border-hairline bg-bg-raised p-3">
          <div className="mb-2 grid grid-cols-4 gap-1">
            {SHORTCUTS.map((shortcut) => (
              <Button
                key={shortcut.label}
                type="button"
                variant="ghost"
                size="xs"
                disabled={shortcutDisabled(shortcut.direction)}
                onClick={() => pickShortcut(shortcut.daysFromToday)}
                className="w-full"
              >
                <span className="truncate">{shortcut.label}</span>
              </Button>
            ))}
          </div>
          <div className="mb-1 flex items-center justify-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={disabled || !canPrev}
              onClick={() => setViewMonth((current) => startOfMonth(addMonths(current, -1)))}
              aria-label="Bulan sebelumnya"
              className="flex-none"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
            <p aria-live="polite" className="m-0 min-w-0 flex-1 text-center font-sans text-sm font-semibold tracking-tight text-paper">
              {format(viewMonth, 'LLLL yyyy', { locale: idLocale })}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={disabled || !canNext}
              onClick={() => setViewMonth((current) => startOfMonth(addMonths(current, 1)))}
              aria-label="Bulan berikut"
              className="flex-none"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
          <Calendar
            mode="single"
            locale={idLocale}
            showOutsideDays={false}
            month={viewMonth}
            onMonthChange={setViewMonth}
            classNames={{ root: 'w-full', months: 'w-full', month: 'w-full', nav: 'hidden', month_caption: 'hidden' }}
            selected={selectedDate}
            onSelect={pickDate}
            disabled={
              mode === 'past'
                ? { after: today }
                : mode === 'future'
                  ? { before: today }
                  : undefined
            }
          />
          <div className="mt-2 flex items-stretch gap-1.5">
            <Select value={parsed === null ? '' : String(parsed.hour)} onValueChange={(next) => { if (next !== null) pickTime('hour', next); }} disabled={disabled}>
              <SelectTrigger size="sm" aria-label="Jam" className="h-8 min-w-0 flex-1 font-mono text-xs">
                <SelectValue placeholder="JJ" />
              </SelectTrigger>
              <SelectContent>
                {HOURS.map((hour) => (
                  <SelectItem key={hour} value={String(hour)}>
                    {pad(hour)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span aria-hidden="true" className="flex items-center font-mono text-xs text-paper-faint">:</span>
            <Select value={parsed === null ? '' : String(parsed.minute)} onValueChange={(next) => { if (next !== null) pickTime('minute', next); }} disabled={disabled}>
              <SelectTrigger size="sm" aria-label="Menit" className="h-8 min-w-0 flex-1 font-mono text-xs">
                <SelectValue placeholder="MM" />
              </SelectTrigger>
              <SelectContent>
                {MINUTES.map((minute) => (
                  <SelectItem key={minute} value={String(minute)}>
                    {pad(minute)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {parsed !== null ? (
              <Button type="button" variant="ghost" size="xs" disabled={disabled} onClick={() => emit(null)} aria-label="Hapus tanggal">
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            ) : null}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
