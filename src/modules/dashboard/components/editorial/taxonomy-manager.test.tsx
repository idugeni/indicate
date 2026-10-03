// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TaxonomyManager } from '@/modules/dashboard/components/editorial/taxonomy-manager';

vi.mock('nuqs', async () => (await import('@/test/stubs/nuqs')).nuqsStub());

afterEach(() => {
  cleanup();
});

const DATA = {
  categories: [
    { id: 'c-1', name: 'Politik', slug: 'politik', status: 'active', version: 1, articleCount: 2 },
    { id: 'c-2', name: 'Ekonomi', slug: 'ekonomi', status: 'active', version: 3, articleCount: 0 },
  ],
  tags: [
    { tag: 'harga-emas', count: 2 },
    { tag: 'politik', count: 1 },
  ],
};

function setup(command?: (action: string, payload: unknown) => Promise<unknown>) {
  const calls: Array<{ readonly action: string; readonly payload: unknown }> = [];
  const handler = command ?? (async (action: string, payload: unknown) => {
    calls.push({ action, payload });
    return {};
  });
  render(<TaxonomyManager data={DATA} command={handler} />);
  return { calls };
}

describe('TaxonomyManager', () => {
  it('membuat kategori dari nama dan slug', async () => {
    const user = userEvent.setup();
    const command = vi.fn(async () => ({}));
    setup(command);
    await user.type(screen.getByLabelText('Nama Kategori'), 'Olahraga');
    expect((screen.getByLabelText('Slug URL') as HTMLInputElement).value).toBe('olahraga');
    await user.click(screen.getByRole('button', { name: 'Daftarkan Kategori' }));
    await waitFor(() => expect(command).toHaveBeenCalledWith('category.create', { name: 'Olahraga', slug: 'olahraga' }, { refresh: true }));
  });

  it('menghapus kategori setelah konfirmasi', async () => {
    const user = userEvent.setup();
    const command = vi.fn(async () => ({}));
    setup(command);
    await user.click(screen.getByRole('button', { name: 'Hapus kategori Ekonomi' }));
    await user.click(await screen.findByRole('button', { name: 'Ya, Hapus Kategori' }));
    await waitFor(() => expect(command).toHaveBeenCalledWith('category.delete', { id: 'c-2', expectedVersion: 3 }, { refresh: true }));
  });

  it('batal hapus kategori tanpa konfirmasi', async () => {
    const user = userEvent.setup();
    const command = vi.fn(async () => ({}));
    setup(command);
    await user.click(screen.getByRole('button', { name: 'Hapus kategori Ekonomi' }));
    await user.click(await screen.findByRole('button', { name: 'Batal' }));
    expect(command).not.toHaveBeenCalled();
  });

  it('mengubah nama tag di semua artikel', async () => {
    const user = userEvent.setup();
    const command = vi.fn(async () => ({}));
    setup(command);
    await user.click(screen.getByLabelText('Tag Asal'));
    await user.click(await screen.findByRole('option', { name: '#harga-emas (2 artikel)' }));
    await user.type(screen.getByLabelText('Tag Tujuan'), 'logammulia');
    await user.click(screen.getByRole('button', { name: 'Perbarui Nama Tag' }));
    await waitFor(() => expect(command).toHaveBeenCalledWith('tag.rename', { from: 'harga-emas', to: 'logammulia' }, { refresh: true }));
  });

  it('menghapus tag setelah konfirmasi', async () => {
    const user = userEvent.setup();
    const command = vi.fn(async () => ({}));
    setup(command);
    await user.click(screen.getByRole('button', { name: 'Hapus tag politik' }));
    await user.click(await screen.findByRole('button', { name: 'Ya, Hapus Tag' }));
    await waitFor(() => expect(command).toHaveBeenCalledWith('tag.remove', { tag: 'politik' }, { refresh: true }));
  });

  it('mengubah kategori lewat dialog', async () => {
    const user = userEvent.setup();
    const command = vi.fn(async () => ({}));
    setup(command);
    await user.click(screen.getByRole('button', { name: 'Ubah kategori Politik' }));
    const dialog = await screen.findByRole('dialog');
    await user.clear(within(dialog).getByLabelText('Nama Kategori'));
    await user.type(within(dialog).getByLabelText('Nama Kategori'), 'Politik Baru');
    await user.click(screen.getByRole('button', { name: 'Simpan Perubahan' }));
    await waitFor(() => expect(command).toHaveBeenCalledWith(
      'category.update',
      expect.objectContaining({ id: 'c-1', expectedVersion: 1, name: 'Politik Baru' }),
      { refresh: true },
    ));
  });

  it('membagi daftar panjang menjadi halaman 12', async () => {
    const user = userEvent.setup();
    const many = Array.from({ length: 13 }, (_, index) => ({
      id: `c-${index}`, name: `Kanal ${index}`, slug: `kanal-${index}`, status: 'active', version: 1, articleCount: 0,
    }));
    render(<TaxonomyManager data={{ categories: many, tags: [] }} command={async () => ({})} />);
    expect(screen.getByText('Kanal 0')).toBeDefined();
    expect(screen.queryByText('Kanal 12')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Ke halaman kanal berikutnya' }));
    expect(screen.getByText('Kanal 12')).toBeDefined();
    expect(screen.queryByText('Kanal 0')).toBeNull();
  });

  it('menyaring kanal lewat cari dan status', async () => {
    const user = userEvent.setup();
    render(<TaxonomyManager data={DATA} command={async () => ({})} />);
    await user.type(screen.getByLabelText('Cari Kategori'), 'eko');
    expect(screen.queryByText('Politik')).toBeNull();
    expect(screen.getByText('Ekonomi')).toBeDefined();
  });

  it('menyembunyikan paginasi dan menyalahkan saringan hanya saat daftarnya kosong', () => {
    const { container } = render(
      <TaxonomyManager data={{ categories: [], tags: [] }} command={async () => ({})} />,
    );
    expect(screen.getByText('Belum ada kanal kategori yang dibuat')).toBeDefined();
    expect(screen.getByText('Belum ada tag yang digunakan dalam artikel')).toBeDefined();
    expect(screen.queryByRole('button', { name: /Ke halaman kanal sebelumnya/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Ke halaman tag berikutnya/ })).toBeNull();
    expect(container.textContent).not.toContain('0–0 dari 0');
  });

  it('menyalahkan saringan, bukan data, saat kanal ada tetapi tidak cocok', async () => {
    const user = userEvent.setup();
    render(<TaxonomyManager data={DATA} command={async () => ({})} />);
    await user.type(screen.getByLabelText('Cari Kategori'), 'tidak-ada-sama-sekali');
    expect(screen.getByText('Tidak ada kategori yang cocok dengan filter')).toBeDefined();
    expect(screen.getByRole('button', { name: /Ke halaman tag sebelumnya/ })).toBeDefined();
  });
});
