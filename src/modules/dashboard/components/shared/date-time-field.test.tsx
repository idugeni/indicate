// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { DateTimeField, formatDateTimeValue, parseDateTimeValue } from '@/modules/dashboard/components/shared/date-time-field';

afterEach(() => {
  cleanup();
});

describe('parseDateTimeValue', () => {
  it('mengurai nilai valid dan menolak yang rusak', () => {
    expect(parseDateTimeValue('2026-09-20T10:30')).toEqual({ year: 2026, month: 9, day: 20, hour: 10, minute: 30 });
    expect(parseDateTimeValue('')).toBeNull();
    expect(parseDateTimeValue('kemarin')).toBeNull();
    expect(parseDateTimeValue('2026-13-40T25:70')).toBeNull();
    expect(parseDateTimeValue('2026-02-30T10:00')).toBeNull();
  });

  it('merakit nilai.zero padded', () => {
    expect(formatDateTimeValue({ year: 2026, month: 1, day: 2, hour: 3, minute: 4 })).toBe('2026-01-02T03:04');
  });
});

describe('DateTimeField', () => {
  it('memilih kemarin lewat pintasan dan memancarkan nilai', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<DateTimeField value="" onChange={onChange} ariaLabel="Tanggal terbit" mode="past" />);

    await user.click(screen.getByRole('button', { name: 'Tanggal terbit' }));
    await user.click(await screen.findByRole('button', { name: 'Kemarin' }));
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    const emitted = String(onChange.mock.calls[0]?.[0] ?? '');
    expect(emitted).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    const picked = new Date(emitted);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(picked.toDateString()).toBe(yesterday.toDateString());
  });

  it('menonaktifkan arah berlawanan sesuai mode', async () => {
    const user = userEvent.setup();
    render(<DateTimeField value="" onChange={() => {}} ariaLabel="Jadwal terbit" mode="future" />);

    await user.click(screen.getByRole('button', { name: 'Jadwal terbit' }));
    expect((await screen.findByRole('button', { name: 'Kemarin' }) as HTMLButtonElement).disabled).toBe(true);
    expect((await screen.findByRole('button', { name: 'Besok' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('menghapus nilai lewat tombol hapus', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<DateTimeField value="2026-09-20T10:30" onChange={onChange} ariaLabel="Tanggal terbit" />);

    await user.click(screen.getByRole('button', { name: 'Tanggal terbit' }));
    await user.click(await screen.findByRole('button', { name: 'Hapus tanggal' }));
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('menampilkan navigasi bulan terpusat tanpa tumpang tindih', async () => {
    const user = userEvent.setup();
    render(<DateTimeField value="" onChange={() => {}} ariaLabel="Tanggal terbit" />);

    await user.click(screen.getByRole('button', { name: 'Tanggal terbit' }));
    expect(await screen.findByRole('button', { name: 'Bulan sebelumnya' })).toBeDefined();
    expect(await screen.findByRole('button', { name: 'Bulan berikut' })).toBeDefined();
  });
});
