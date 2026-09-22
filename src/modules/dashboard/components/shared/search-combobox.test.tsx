// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { SearchCombobox } from '@/modules/dashboard/components/shared/search-combobox';

const OPTIONS = [
  { value: 'r-1', label: 'Wonosobo' },
  { value: 'r-2', label: 'Semarang' },
];

afterEach(() => cleanup());

describe('SearchCombobox', () => {
  it('menyaring opsi, mengirim id terpilih, dan ikut form.reset', async () => {
    const user = userEvent.setup();
    const submitted: { current: FormData | null } = { current: null };
    render(
      <form onSubmit={(e) => { e.preventDefault(); submitted.current = new FormData(e.currentTarget); }}>
        <SearchCombobox name="regionId" placeholder="Pilih wilayah" options={OPTIONS} />
        <button type="submit">Kirim</button>
      </form>,
    );
    const input = screen.getByPlaceholderText('Pilih wilayah');
    await user.click(input);
    expect(await screen.findByRole('option', { name: 'Wonosobo' })).toBeDefined();
    await user.type(input, 'sem');
    await waitFor(() => expect(screen.queryByRole('option', { name: 'Wonosobo' })).toBeNull());
    expect(await screen.findByRole('option', { name: 'Semarang' })).toBeDefined();
    await user.clear(input);
    await user.type(input, 'won');
    await waitFor(() => expect(screen.queryByRole('option', { name: 'Semarang' })).toBeNull());
    await user.keyboard('{Enter}');
    expect((input as HTMLInputElement).value).toContain('Wonosobo');
    await user.click(screen.getByRole('button', { name: 'Kirim' }));
    expect(submitted.current?.get('regionId')).toBe('r-1');
    fireEvent.reset(input.closest('form')!);
    expect((input as HTMLInputElement).value).toBe('');
  });

  it('mendukung navigasi keyboard panah dan Escape', async () => {
    const user = userEvent.setup();
    render(<SearchCombobox placeholder="Pilih wilayah" options={OPTIONS} />);
    const input = screen.getByPlaceholderText('Pilih wilayah');
    await user.click(input);
    await user.keyboard('{ArrowDown}{Escape}');
    expect(screen.queryByRole('listbox')).toBeNull();
  });
});
