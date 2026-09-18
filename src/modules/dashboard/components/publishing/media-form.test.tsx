// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { MediaForm } from '@/modules/dashboard/components/publishing/media-form';

const DATA = {
  articles: [{ id: 'art-1' }],
  sites: [{ id: 's-1', normalizedHostname: 'portal.example' }],
};

afterEach(() => {
  cleanup();
});

describe('Formulir unggah media', () => {
  it('merender medan berkas, tujuan, dan kepemilikan', () => {
    render(<MediaForm data={DATA} command={vi.fn(async () => ({}))} />);
    expect(screen.getByText('Unggah media')).toBeDefined();
    expect(screen.getByLabelText(/Pilih Berkas Gambar/)).toBeDefined();
    expect(screen.getByLabelText(/Tujuan Penggunaan/)).toBeDefined();
    expect(screen.getByLabelText('Tipe Kepemilikan')).toBeDefined();
    expect(screen.getByRole('button', { name: /otorisasi & unggah aset/i })).toBeDefined();
  });

  it('menolak submit tanpa berkas yang valid', async () => {
    const command = vi.fn(async () => ({}));
    const { container } = render(<MediaForm data={DATA} command={command} />);
    fireEvent.change(screen.getByLabelText(/Tujuan Penggunaan/), { target: { value: 'hero_banner' } });
    fireEvent.submit(container.querySelector('form') as HTMLFormElement);
    expect(await screen.findByText('Silakan pilih berkas media yang valid.')).toBeDefined();
    expect(command).not.toHaveBeenCalled();
  });

  it('menampilkan opsi pemilik dari artikel dan situs', () => {
    render(<MediaForm data={DATA} command={vi.fn(async () => ({}))} />);
    expect(screen.getByRole('option', { name: 'Organisasi Induk' })).toBeDefined();
    expect(screen.getByRole('option', { name: 'Artikel: art-1' })).toBeDefined();
    expect(screen.getByRole('option', { name: 'Site: portal.example' })).toBeDefined();
  });
});
