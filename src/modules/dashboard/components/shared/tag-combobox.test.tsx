// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TagCombobox } from '@/modules/dashboard/components/shared/tag-combobox';

afterEach(() => cleanup());

describe('TagCombobox', () => {
  it('memilih saran, membuat tag baru, menghapus chip, dan mengirim koma', async () => {
    const user = userEvent.setup();
    const submitted: { current: FormData | null } = { current: null };
    render(
      <form onSubmit={(e) => { e.preventDefault(); submitted.current = new FormData(e.currentTarget); }}>
        <TagCombobox name="tags" placeholder="cth: wonosobo" suggestions={['wonosobo', 'pertanian']} />
        <button type="submit">Kirim</button>
      </form>,
    );
    const input = screen.getByPlaceholderText('cth: wonosobo');
    await user.click(input);
    expect(await screen.findByRole('option', { name: 'pertanian' })).toBeDefined();
    await user.type(input, 'won');
    await user.keyboard('{ArrowDown}{Enter}');
    expect(screen.getByText('wonosobo')).toBeDefined();
    await user.type(input, 'baru');
    await user.keyboard('{Enter}');
    expect(screen.getByText('baru')).toBeDefined();
    await user.click(screen.getByRole('button', { name: 'Kirim' }));
    expect(submitted.current?.get('tags')).toBe('wonosobo,baru');
    await user.click(screen.getByRole('button', { name: 'Hapus tag baru' }));
    expect(screen.queryByText('baru')).toBeNull();
  });

  it('menghapus chip terakhir dengan Backspace saat query kosong', async () => {
    const user = userEvent.setup();
    render(<TagCombobox name="tags" placeholder="cth" suggestions={[]} defaultValue={['satu', 'dua']} />);
    expect(screen.getByText('dua')).toBeDefined();
    await user.click(screen.getByRole('combobox'));
    await user.keyboard('{Backspace}');
    expect(screen.queryByText('dua')).toBeNull();
    expect(screen.getByText('satu')).toBeDefined();
  });

  it('menambah topik lewat tombol popup tanpa keyboard', async () => {
    const user = userEvent.setup();
    render(<TagCombobox name="tags" placeholder="cth" suggestions={['perdesa']} defaultValue={[]} />);
    const input = screen.getByPlaceholderText('cth');
    await user.click(input);
    await user.type(input, 'agr');
    const add = await screen.findByRole('button', { name: /Tambah "agr" sebagai topik baru/ });
    await user.click(add);
    expect(screen.getByText('agr')).toBeDefined();
    expect(screen.queryByRole('button', { name: /Tambah "agr"/ })).toBeNull();
  });

  it('menyembunyikan tombol tambah saat topik sudah dipilih', async () => {
    const user = userEvent.setup();
    render(<TagCombobox name="tags" placeholder="cth" suggestions={['agr']} defaultValue={['agr']} />);
    // A selected tag hides the placeholder, so reach the input by role instead.
    const input = screen.getByRole('combobox');
    await user.click(input);
    await user.type(input, 'agr');
    // 'agr' is already a chip, so it is filtered out of the pool and must not
    // be offered as a create action either.
    expect(screen.queryByRole('option', { name: 'agr' })).toBeNull();
    expect(screen.queryByRole('button', { name: /sebagai topik baru/ })).toBeNull();
  });
});
