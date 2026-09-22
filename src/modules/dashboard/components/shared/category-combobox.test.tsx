// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CategoryCombobox } from '@/modules/dashboard/components/shared/category-combobox';

afterEach(() => {
  cleanup();
});

const CATEGORIES = [
  { id: 'c-1', name: 'Politik' },
  { id: 'c-2', name: 'Ekonomi' },
];

function setup(options: {
  value?: readonly string[];
  onValueChange?: (ids: readonly string[]) => void;
  onCreateCategory?: (name: string) => Promise<string | null>;
} = {}) {
  const onValueChange = vi.fn((ids: readonly string[]) => options.onValueChange?.(ids));
  const onCreateCategory = vi.fn(async (name: string) => {
    if (options.onCreateCategory) return options.onCreateCategory(name);
    return null;
  });
  render(
    <>
      <label htmlFor="kategori">Kategori</label>
      <CategoryCombobox
        id="kategori"
        categories={CATEGORIES}
        value={options.value ?? []}
        onValueChange={onValueChange}
        onCreateCategory={onCreateCategory}
        placeholder="Ketik nama kategori..."
      />
    </>,
  );
  return { onValueChange, onCreateCategory };
}

describe('CategoryCombobox', () => {
  it('menampilkan tombol tambah di dalam popup hanya bila belum ada yang cocok persis', async () => {
    const user = userEvent.setup();
    setup({});
    await user.click(screen.getByLabelText('Kategori'));
    await user.type(screen.getByLabelText('Kategori'), 'Olahraga');
    await waitFor(() => expect(screen.queryByRole('option')).toBeNull());
    expect(screen.getByRole('button', { name: /Tambah.*Olahraga.*kategori baru/ })).toBeDefined();
  });

  it('menyembunyikan tombol tambah bila nama sudah ada walau beda huruf', async () => {
    const user = userEvent.setup();
    setup({});
    await user.click(screen.getByLabelText('Kategori'));
    await user.type(screen.getByLabelText('Kategori'), 'politik');
    await waitFor(() => expect(screen.getByRole('option', { name: 'Politik' })).toBeDefined());
    expect(screen.queryByRole('button', { name: /sebagai kategori baru/ })).toBeNull();
  });

  it('membuat kategori baru lewat Enter saat tidak ada yang cocok', async () => {
    const user = userEvent.setup();
    const onCreateCategory = vi.fn(async () => 'c-9');
    setup({ onCreateCategory });
    await user.click(screen.getByLabelText('Kategori'));
    await user.type(screen.getByLabelText('Kategori'), 'Olahraga');
    await user.keyboard('{Enter}');
    await waitFor(() => expect(onCreateCategory).toHaveBeenCalledWith('Olahraga'));
  });

  it('mengirim id terpilih lewat hidden input categoryIds', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <form>
        <CategoryCombobox
          categories={CATEGORIES}
          value={['c-2']}
          onValueChange={() => {}}
          onCreateCategory={async () => null}
        />
      </form>,
    );
    expect(container.querySelector('input[type="hidden"][name="categoryIds"]')?.getAttribute('value')).toBe('c-2');
    await user.click(screen.getByRole('combobox'));
    expect(await screen.findByRole('option', { name: 'Politik' })).toBeDefined();
    expect(screen.queryByRole('option', { name: 'Ekonomi' })).toBeNull();
  });
});
