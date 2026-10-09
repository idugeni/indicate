// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { PublisherNetworkV2 } from '@/modules/dashboard/components/editorial/publisher-network-v2';
import type { DashboardCommand } from '@/modules/dashboard/command';

afterEach(() => cleanup());

const DATA = {
  publishers: [
    { id: 'pub-1', name: 'Radar Banyumas', attributionLabel: 'Redaksi Radar Banyumas', type: 'company', verificationStatus: 'pending', status: 'active', evidenceReference: 'doc-1', version: 3 },
    { id: 'pub-2', name: 'Media Jateng', attributionLabel: 'Redaksi Media Jateng', type: 'independent_publisher', verificationStatus: 'verified', status: 'active', version: 2 },
  ],
  affiliations: [
    { publisherId: 'pub-1', institutionName: 'Radar Banyumas', siteId: 'site-1', cityName: 'Banyumas', active: true, portalCount: 2 },
  ],
};

function setup(command: DashboardCommand = vi.fn(async () => ({ ok: true })) as unknown as DashboardCommand, onFilterApply = vi.fn()) {
  return render(
    <PublisherNetworkV2
      data={DATA}
      command={command}
      organizationId="org-1"
      onFilterApply={onFilterApply}
    />,
  );
}

describe('PublisherNetworkV2', () => {
  it('menampilkan ringkasan jaringan dan memilih detail publisher', () => {
    setup();
    expect(screen.getByText('Publisher Network')).toBeTruthy();
    expect(screen.getByText('2', { selector: 'p' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Media Jateng/i }));
    expect(screen.getByText(/Governance workspace/i)).toBeTruthy();
  });

  it('meneruskan pencarian ke filter server saat form dikirim', () => {
    const onFilterApply = vi.fn();
    setup(undefined, onFilterApply);
    fireEvent.change(screen.getByRole('textbox', { name: /Cari publisher/i }), { target: { value: ' Radar ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cari' }));
    expect(onFilterApply).toHaveBeenCalledWith('&search=Radar');
  });

  it('menggunakan command production untuk approval dengan optimistic version', async () => {
    const command = vi.fn(async () => ({ id: 'pub-1' }));
    setup(command);
    fireEvent.click(screen.getByRole('button', { name: /Radar Banyumas/i }));
    fireEvent.click(screen.getByRole('button', { name: /Setujui/i }));
    await waitFor(() => expect(command).toHaveBeenCalledWith(
      'publisher.approve',
      expect.objectContaining({ id: 'pub-1', expectedVersion: 3 }),
      { refresh: true },
    ));
  });

  it('mengirim alasan penolakan dengan optimistic version', async () => {
    const command = vi.fn(async () => ({ id: 'pub-1' }));
    setup(command);
    fireEvent.click(screen.getByRole('button', { name: /Radar Banyumas/i }));
    vi.stubGlobal('prompt', vi.fn(() => 'Bukti belum cukup'));
    fireEvent.click(screen.getByRole('button', { name: /Tolak/i }));
    await waitFor(() => expect(command).toHaveBeenCalledWith(
      'publisher.reject',
      expect.objectContaining({ id: 'pub-1', expectedVersion: 3, reason: 'Bukti belum cukup' }),
      { refresh: true },
    ));
    vi.unstubAllGlobals();
  });

  it('mendaftarkan publisher lewat command production', async () => {
    const command = vi.fn(async () => ({ id: 'pub-9' }));
    setup(command);
    fireEvent.click(screen.getByRole('button', { name: /Daftar penerbit/i }));
    fireEvent.change(screen.getByLabelText(/Nama resmi/i), { target: { value: 'Portal Baru' } });
    fireEvent.change(screen.getByLabelText(/Label atribusi/i), { target: { value: 'Redaksi Portal Baru' } });
    fireEvent.click(screen.getByRole('button', { name: /Daftarkan/i }));
    await waitFor(() => expect(command).toHaveBeenCalledWith(
      'publisher.create',
      expect.objectContaining({ name: 'Portal Baru', contacts: {} }),
      { refresh: true },
    ));
  });
});
