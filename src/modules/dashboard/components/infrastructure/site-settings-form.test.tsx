// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { SiteSettingsForm } from '@/modules/dashboard/components/infrastructure/site-settings-form';

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <span role="img" aria-label={alt} data-src={src} />,
}));

afterEach(() => {
  cleanup();
});

const DATA = {
  sites: [{ id: 's-1', normalizedHostname: 'portal.example' }],
  siteSettings: [],
};

describe('Formulir pengaturan situs', () => {
  it('meminta pembuatan situs saat belum ada situs', () => {
    render(<SiteSettingsForm data={{ sites: [] }} command={vi.fn(async () => ({}))} />);
    expect(screen.getByText('Belum ada situs. Buat situs dulu pada panel di atas.')).toBeDefined();
  });

  it('merender editor untuk situs aktif', () => {
    render(<SiteSettingsForm data={DATA} command={vi.fn(async () => ({}))} />);
    expect(screen.getByLabelText('Nama situs')).toBeDefined();
    expect((screen.getByLabelText('Nama situs') as HTMLInputElement).value).toBe('portal.example');
    expect(screen.getByLabelText('Tampilan situs (template)')).toBeDefined();
    expect(screen.getByRole('button', { name: /simpan pengaturan situs/i })).toBeDefined();
  });

  it('menyimpan pengaturan situs lewat command', async () => {
    const command = vi.fn(async () => ({}));
    const { container } = render(<SiteSettingsForm data={DATA} command={command} />);
    fireEvent.change(screen.getByLabelText('Nama situs'), { target: { value: 'Portal Contoh' } });
    fireEvent.change(screen.getByLabelText('Tampilan situs (template)'), { target: { value: 'clean-blue' } });
    fireEvent.submit(container.querySelector('form') as HTMLFormElement);
    await waitFor(() =>
      expect(command).toHaveBeenCalledWith(
        'site.settings.update',
        expect.objectContaining({ siteId: 's-1', name: 'Portal Contoh' }),
      ),
    );
  });

  it('menahan penyimpanan saat template belum dipilih', async () => {
    const command = vi.fn(async () => ({}));
    const { container } = render(<SiteSettingsForm data={DATA} command={command} />);
    fireEvent.change(screen.getByLabelText('Nama situs'), { target: { value: 'Portal Contoh' } });
    fireEvent.submit(container.querySelector('form') as HTMLFormElement);
    await waitFor(() => expect(screen.getByText('Pilih template situs terlebih dahulu.')).toBeDefined());
    expect(command).not.toHaveBeenCalled();
  });

  it('membatalkan penyimpanan saat JSON warna tidak valid', async () => {
    const command = vi.fn(async () => ({}));
    const { container } = render(<SiteSettingsForm data={DATA} command={command} />);
    fireEvent.change(screen.getByLabelText('Warna (format JSON)'), { target: { value: 'bukan-json' } });
    fireEvent.submit(container.querySelector('form') as HTMLFormElement);
    await waitFor(() => expect(command).not.toHaveBeenCalled());
  });
});
