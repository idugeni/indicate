// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { ConfigurationPanel } from '@/modules/dashboard/components/infrastructure/configuration-panel';

const DATA = {
  domains: [{ id: 'd-1', normalizedHostname: 'apex.example' }],
  regions: [{ id: 'r-1', name: 'Wonosobo' }],
  sites: [],
};

function stubRuntime(): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ status: 404, ok: false, json: async () => ({}) })),
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Panel konfigurasi infrastruktur', () => {
  it('merender tiga seksi tambah dan panel kebijakan', async () => {
    stubRuntime();
    render(<ConfigurationPanel data={DATA} command={vi.fn(async () => ({}))} />);
    expect(screen.getByRole('region', { name: 'Tambah domain' })).toBeDefined();
    expect(screen.getByRole('region', { name: 'Tambah wilayah' })).toBeDefined();
    expect(screen.getByRole('region', { name: 'Tambah situs' })).toBeDefined();
    expect(screen.getByRole('region', { name: 'Kebijakan media' })).toBeDefined();
    expect(screen.getByRole('region', { name: 'Ringkasan kebijakan platform' })).toBeDefined();
  });

  it('membuat domain baru lewat command', async () => {
    stubRuntime();
    const command = vi.fn(async () => ({}));
    const { container } = render(<ConfigurationPanel data={DATA} command={command} />);
    fireEvent.change(screen.getByLabelText('Nama domain utama'), { target: { value: 'Contoh.Co.ID' } });
    fireEvent.submit(container.querySelectorAll('form')[0] as HTMLFormElement);
    await waitFor(() =>
      expect(command).toHaveBeenCalledWith(
        'domain.create',
        expect.objectContaining({ normalizedHostname: 'contoh.co.id', status: 'inactive' }),
      ),
    );
  });

  it('membuat wilayah baru lewat command', async () => {
    stubRuntime();
    const command = vi.fn(async () => ({}));
    const { container } = render(<ConfigurationPanel data={DATA} command={command} />);
    fireEvent.change(screen.getByLabelText('Nama wilayah'), { target: { value: 'Wonosobo' } });
    fireEvent.change(screen.getByLabelText('Kode Wilayah'), { target: { value: 'wonosobo' } });
    fireEvent.submit(container.querySelectorAll('form')[1] as HTMLFormElement);
    await waitFor(() =>
      expect(command).toHaveBeenCalledWith(
        'region.create',
        expect.objectContaining({ name: 'Wonosobo', slug: 'wonosobo', status: 'active' }),
      ),
    );
  });

  it('membuat situs baru lewat command', async () => {
    stubRuntime();
    const command = vi.fn(async () => ({}));
    const { container } = render(<ConfigurationPanel data={DATA} command={command} />);
    fireEvent.change(screen.getByLabelText('Alamat Situs'), { target: { value: 'Wonosobo.SuaraDesa.net' } });
    fireEvent.submit(container.querySelectorAll('form')[2] as HTMLFormElement);
    await waitFor(() =>
      expect(command).toHaveBeenCalledWith(
        'site.create',
        expect.objectContaining({ normalizedHostname: 'wonosobo.suaradesa.net', status: 'inactive' }),
      ),
    );
  });
});
