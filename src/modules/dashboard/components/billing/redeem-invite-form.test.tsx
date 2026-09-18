// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { RedeemInviteForm } from '@/modules/dashboard/components/billing/redeem-invite-form';

const refreshMock = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

afterEach(() => {
  cleanup();
  refreshMock.mockReset();
  vi.unstubAllGlobals();
});

describe('Formulir tukar undangan', () => {
  it('merender medan kode undangan', () => {
    render(<RedeemInviteForm />);
    expect(screen.getByText('Punya kode undangan?')).toBeDefined();
    expect(screen.getByLabelText('Kode undangan')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Tukarkan undangan' })).toBeDefined();
  });

  it('menolak kode dengan format yang salah tanpa memanggil API', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    render(<RedeemInviteForm />);
    fireEvent.change(screen.getByLabelText('Kode undangan'), { target: { value: 'tanpa-pemisah' } });
    fireEvent.submit(screen.getByLabelText('Kode undangan').closest('form') as HTMLFormElement);
    expect(await screen.findByText('Kode tidak valid, kedaluwarsa, atau email tidak cocok.')).toBeDefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('menampilkan status berhasil dan memuat ulang dasbor', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true })));
    render(<RedeemInviteForm />);
    fireEvent.change(screen.getByLabelText('Kode undangan'), { target: { value: 'org-1:anggota@organisasi.id:rahasia-uji' } });
    fireEvent.submit(screen.getByLabelText('Kode undangan').closest('form') as HTMLFormElement);
    expect(await screen.findByText('Undangan diterima. Memuat dasbor…')).toBeDefined();
    await waitFor(() => expect(refreshMock).toHaveBeenCalledTimes(1));
  });

  it('menampilkan galat saat server menolak token', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 410 })));
    render(<RedeemInviteForm />);
    fireEvent.change(screen.getByLabelText('Kode undangan'), { target: { value: 'org-1:anggota@organisasi.id:rahasia-uji' } });
    fireEvent.submit(screen.getByLabelText('Kode undangan').closest('form') as HTMLFormElement);
    expect(await screen.findByText('Kode tidak valid, kedaluwarsa, atau email tidak cocok.')).toBeDefined();
  });
});
