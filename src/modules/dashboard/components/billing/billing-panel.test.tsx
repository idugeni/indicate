// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { BillingPanel } from '@/modules/dashboard/components/billing/billing-panel';

function stubBilling(state: string, invoices: unknown[]) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string) => {
      const url = String(input);
      if (url.includes('scope=subscription-state')) return { ok: true, json: async () => ({ state }) };
      if (url.includes('scope=invoices')) return { ok: true, json: async () => invoices };
      return { ok: true, json: async () => ({}) };
    }),
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const FAKTUR = [
  {
    id: 'inv-1',
    organizationId: 'org-1',
    number: 'IND-ORG-2601-0001-AB12',
    amountIdr: 550000,
    currency: 'IDR',
    status: 'paid',
    paidAt: '2026-01-05T00:00:00.000Z',
    billingNote: 'Transfer bank',
    paymentMethod: 'Transfer bank',
    voidedAt: null,
    voidReason: null,
    version: 1,
    createdAt: '2026-01-05T00:00:00.000Z',
  },
];

describe('Panel langganan', () => {
  it('menampilkan status aktif dan daftar faktur', async () => {
    stubBilling('active', FAKTUR);
    render(<BillingPanel organizationId="org-1" permissions={[]} />);
    expect(await screen.findByText('Aktif')).toBeDefined();
    expect(await screen.findByText(/IND-ORG-2601-0001-AB12/)).toBeDefined();
    expect(screen.getByText(/Lunas/)).toBeDefined();
    expect(screen.getByRole('button', { name: 'Unduh' })).toBeDefined();
  });

  it('menampilkan pesan kosong saat belum ada faktur', async () => {
    stubBilling('suspended', []);
    render(<BillingPanel organizationId="org-1" permissions={[]} />);
    expect(await screen.findByText('Ditangguhkan')).toBeDefined();
    expect(await screen.findByText('Belum ada faktur.')).toBeDefined();
  });

  it('menampilkan panel manual khusus platform', async () => {
    stubBilling('active', []);
    render(<BillingPanel organizationId="org-1" permissions={['platform.super_admin']} />);
    expect(await screen.findByText(/Ubah status \(pembayaran manual di luar sistem\)/)).toBeDefined();
    expect(await screen.findByText(/Catat invoice \(pembayaran manual terkonfirmasi\)/)).toBeDefined();
  });

  it('menolak status manual tanpa UUID organisasi', async () => {
    stubBilling('active', []);
    render(<BillingPanel organizationId="org-1" permissions={['platform.super_admin']} />);
    await screen.findByText(/Ubah status \(pembayaran manual di luar sistem\)/);
    fireEvent.click(screen.getByRole('button', { name: 'Terapkan status' }));
    expect(await screen.findByText('Isi UUID organisasi target dulu.')).toBeDefined();
  });

  it('menolak invoice tanpa nominal yang valid', async () => {
    stubBilling('active', []);
    render(<BillingPanel organizationId="org-1" permissions={['platform.super_admin']} />);
    await screen.findByText(/Catat invoice \(pembayaran manual terkonfirmasi\)/);
    fireEvent.click(screen.getByRole('button', { name: 'Catat invoice' }));
    expect(await screen.findByText('Isi UUID organisasi dan nominal yang valid.')).toBeDefined();
  });
});
