// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
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
    expect(screen.getByRole('button', { name: 'Sisipkan gambar' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Advance' })).toBeDefined();
    expect(screen.getByRole('status')).toBeDefined();
  });

  it('membuka format lanjutan berisi tombol enterprise: tabel, perataan, stabilo, garis', async () => {
    const user = userEvent.setup();
    render(<RichTextEditor onDocChange={() => {}} command={async () => null} labelledBy="body-label" />);
    await user.click(screen.getByRole('button', { name: 'Advance' }));
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

  it('membuka panel URL gambar dari menu sisip gambar', async () => {
    const user = userEvent.setup();
    render(<RichTextEditor onDocChange={() => {}} command={async () => null} labelledBy="body-label" />);
    expect(screen.queryByLabelText('URL gambar')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Sisipkan gambar' }));
    await user.click(screen.getByRole('menuitem', { name: 'Dari URL luar' }));
    expect(screen.getByLabelText('URL gambar')).toBeDefined();
    expect(screen.getByLabelText(/Alt/)).toBeDefined();
  });

  it('menolak URL gambar yang tidak aman', async () => {
    const user = userEvent.setup();
    render(<RichTextEditor onDocChange={() => {}} command={async () => null} labelledBy="body-label" />);
    await user.click(screen.getByRole('button', { name: 'Sisipkan gambar' }));
    await user.click(screen.getByRole('menuitem', { name: 'Dari URL luar' }));
    await user.type(screen.getByLabelText('URL gambar'), 'notaurl');
    await user.click(screen.getByRole('button', { name: 'Sisipkan' }));
    expect(screen.getByRole('status').textContent ?? '').toContain('tidak valid');
  });

  it('hanya membuka satu panel semat dalam satu waktu', async () => {
    const user = userEvent.setup();
    render(<RichTextEditor onDocChange={() => {}} command={async () => null} labelledBy="body-label" />);
    await user.click(screen.getByRole('button', { name: 'Advance' }));
    await user.click(screen.getByRole('button', { name: 'Sematan YouTube' }));
    expect(screen.getByLabelText('URL/ID YouTube')).toBeDefined();
    await user.click(screen.getByRole('button', { name: 'Sematan sosial' }));
    expect(screen.getByLabelText('URL postingan sosial')).toBeDefined();
    expect(screen.queryByLabelText('URL/ID YouTube')).toBeNull();
  });

  it('menonaktifkan toolbar saat disabled', () => {
    render(<RichTextEditor onDocChange={() => {}} command={async () => null} disabled />);
    expect(screen.getByRole('button', { name: 'Tebal' }).hasAttribute('disabled')).toBe(true);
  });

  it('menampilkan tombol poles di toolbar hanya bila disediakan', async () => {
    const user = userEvent.setup();
    const onPolish = vi.fn();
    const { unmount } = render(
      <RichTextEditor onDocChange={() => {}} command={async () => null} labelledBy="body-label" onPolish={onPolish} polishLabel="Poles ulang" />,
    );
    await user.click(screen.getByRole('button', { name: 'Poles ulang' }));
    expect(onPolish).toHaveBeenCalledTimes(1);
    unmount();
    render(<RichTextEditor onDocChange={() => {}} command={async () => null} labelledBy="body-label" />);
    expect(screen.queryByRole('button', { name: 'Poles isi' })).toBeNull();
  });
});
