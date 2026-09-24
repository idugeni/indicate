// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { RichTextEditor } from '@/modules/dashboard/components/editorial/rich-text-editor';

afterEach(() => {
  cleanup();
});

describe('RichTextEditor', () => {
  it('merender toolbar berlabel, kanvas, dan status aksesibel', () => {
    render(<RichTextEditor onDocChange={() => {}} command={async () => null} labelledBy="body-label" />);
    expect(screen.getByRole('toolbar', { name: 'Format teks' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Tebal' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'H2' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Unggah gambar' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Lanjutan' })).toBeDefined();
    expect(screen.getByRole('status')).toBeDefined();
  });

  it('membuka format lanjutan berisi tombol enterprise: tabel, perataan, stabilo, garis', async () => {
    const user = userEvent.setup();
    render(<RichTextEditor onDocChange={() => {}} command={async () => null} labelledBy="body-label" />);
    await user.click(screen.getByRole('button', { name: 'Lanjutan' }));
    expect(screen.getByRole('button', { name: 'Garis Bawah' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Kode Sebaris' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Stabilo' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Tengah' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Garis' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Tabel' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Hapus Tabel' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Sematan YouTube' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Sematan sosial' })).toBeDefined();
    expect(screen.getByLabelText('Warna teks')).toBeDefined();
  });

  it('menyembunyikan panel keterangan sampai gambar diklik', () => {
    render(<RichTextEditor onDocChange={() => {}} command={async () => null} labelledBy="body-label" />);
    expect(screen.queryByLabelText('Keterangan gambar')).toBeNull();
  });

  it('menonaktifkan toolbar saat disabled', () => {
    render(<RichTextEditor onDocChange={() => {}} command={async () => null} disabled />);
    expect(screen.getByRole('button', { name: 'Tebal' }).hasAttribute('disabled')).toBe(true);
  });
});
