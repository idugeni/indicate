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

interface CapturedPost {
  readonly url: string;
  readonly body: { readonly action?: string; readonly payload?: Record<string, unknown> };
}

function stubBillingWithCapture(state: string, invoices: unknown[]) {
  const posts: CapturedPost[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init?: RequestInit) => {
      const url = String(input);
      if (init?.method === 'POST') {
        posts.push({ url, body: JSON.parse(String(init.body)) as CapturedPost['body'] });
        return { ok: true, json: async () => ({}) };
      }
      if (url.includes('scope=subscription-state')) return { ok: true, json: async () => ({ state }) };
      if (url.includes('scope=invoices')) return { ok: true, json: async () => invoices };
      return { ok: true, json: async () => ({}) };
    }),
  );
  return posts;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const INVOICES = [
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

const VOIDED_INVOICES = [
  {
    id: 'inv-2',
    organizationId: 'org-1',
    number: 'IND-ORG-2601-0002-CD34',
    amountIdr: 550000,
    currency: 'IDR',
    status: 'voided',
    paidAt: '2026-01-06T00:00:00.000Z',
    billingNote: 'Transfer bank',
    paymentMethod: 'Transfer bank',
    voidedAt: '2026-01-07T00:00:00.000Z',
    voidReason: 'salah catat',
    version: 2,
    createdAt: '2026-01-06T00:00:00.000Z',
  },
];

describe('Panel langganan', () => {
  it('menampilkan status aktif dan daftar faktur', async () => {
    stubBilling('active', INVOICES);
    render(<BillingPanel organizationId="org-1" permissions={[]} />);
    expect(await screen.findByText('Aktif')).toBeDefined();
    fireEvent.click(screen.getByRole('tab', { name: 'Faktur' }));
    expect(await screen.findByText(/IND-ORG-2601-0001-AB12/)).toBeDefined();
    expect(screen.getByText(/Lunas/)).toBeDefined();
    expect(screen.getByRole('button', { name: 'Unduh' })).toBeDefined();
  });

  it('menampilkan pesan kosong saat belum ada faktur', async () => {
    stubBilling('suspended', []);
    render(<BillingPanel organizationId="org-1" permissions={[]} />);
    expect(await screen.findByText('Ditangguhkan')).toBeDefined();
    fireEvent.click(screen.getByRole('tab', { name: 'Faktur' }));
    expect(await screen.findByText('Belum ada faktur.')).toBeDefined();
  });

  it('menyusun ringkasan faktur kosong tanpa blok di dalam paragraf', async () => {
    const violations: string[] = [];
    vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      violations.push(String(args[0]));
    });
    stubBilling('suspended', []);
    render(<BillingPanel organizationId="org-1" permissions={[]} />);
    const summaryEmpty = await screen.findByText('Belum ada faktur tercatat untuk organisasi ini.');
    expect(summaryEmpty.closest('p')).toBeNull();
    expect(violations.filter((message) => message.includes('cannot be a descendant of'))).toEqual([]);
  });

  it('menampilkan panel manual khusus platform', async () => {
    stubBilling('active', []);
    render(<BillingPanel organizationId="org-1" permissions={['platform.super_admin']} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Admin' }));
    expect(await screen.findByText(/Ubah status \(pembayaran manual di luar sistem\)/)).toBeDefined();
    expect(await screen.findByText(/Catat faktur \(pembayaran manual terkonfirmasi\)/)).toBeDefined();
  });

  it('menolak status manual tanpa ID organisasi', async () => {
    stubBilling('active', []);
    render(<BillingPanel organizationId="org-1" permissions={['platform.super_admin']} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Admin' }));
    await screen.findByText(/Ubah status \(pembayaran manual di luar sistem\)/);
    fireEvent.click(screen.getByRole('button', { name: 'Terapkan status' }));
    expect(await screen.findByText('Isi ID organisasi target dulu.')).toBeDefined();
  });

  it('menolak faktur tanpa nominal yang valid', async () => {
    stubBilling('active', []);
    render(<BillingPanel organizationId="org-1" permissions={['platform.super_admin']} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Admin' }));
    await screen.findByText(/Catat faktur \(pembayaran manual terkonfirmasi\)/);
    fireEvent.click(screen.getByRole('button', { name: 'Catat faktur' }));
    expect(await screen.findByText('Isi ID organisasi dan nominal yang valid.')).toBeDefined();
  });

  it('mengisi bawaan harga tunggal dan mengizinkan ubah manual', async () => {
    stubBilling('active', []);
    render(<BillingPanel organizationId="org-1" permissions={['platform.super_admin']} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Admin' }));
    await screen.findByText(/Catat faktur \(pembayaran manual terkonfirmasi\)/);
    const amount = screen.getByLabelText('Nominal (Rp)') as HTMLInputElement;
    expect(amount.value).toBe('550000');
    expect(amount.readOnly).toBe(false);
    fireEvent.change(amount, { target: { value: '750000' } });
    expect(amount.value).toBe('750000');
    expect(screen.getByText('Bawaan Rp550.000/bulan — dapat diubah manual')).toBeDefined();
  });

  it('mencatat faktur lewat envelope billing', async () => {
    const posts = stubBillingWithCapture('active', []);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<BillingPanel organizationId="org-1" permissions={['platform.super_admin']} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Admin' }));
    await screen.findByText(/Catat faktur \(pembayaran manual terkonfirmasi\)/);
    fireEvent.change(screen.getByPlaceholderText('ID organisasi…'), { target: { value: 'org-2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Catat faktur' }));
    expect(await screen.findByText('Faktur tercatat.')).toBeDefined();
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('Rp550.000'));
    const post = posts.find((call) => call.url === '/api/dashboard/billing');
    expect(post?.body.action).toBe('invoice.create');
    expect(post?.body.payload).toMatchObject({ organizationId: 'org-2', amountIdr: 550000 });
    expect(posts.some((call) => call.url === '/api/dashboard/integrations')).toBe(false);
  });

  it('membatalkan faktur lewat envelope billing', async () => {
    const posts = stubBillingWithCapture('active', INVOICES);
    vi.spyOn(window, 'prompt').mockReturnValue('salah catat');
    render(<BillingPanel organizationId="org-1" permissions={['platform.super_admin']} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Faktur' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Batalkan' }));
    expect(await screen.findByText(/dibatalkan/)).toBeDefined();
    const post = posts.find((call) => call.url === '/api/dashboard/billing');
    expect(post?.body.action).toBe('invoice.void');
    expect(post?.body.payload).toMatchObject({ invoiceId: 'inv-1', expectedVersion: 1, reason: 'salah catat' });
  });

  it('menerbitkan ulang tagihan batal lewat envelope billing', async () => {
    const posts = stubBillingWithCapture('active', VOIDED_INVOICES);
    vi.spyOn(window, 'prompt').mockReturnValue('koreksi nomor');
    render(<BillingPanel organizationId="org-1" permissions={['platform.super_admin']} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Faktur' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Terbitkan ulang' }));
    expect(await screen.findByText(/terbit/)).toBeDefined();
    const post = posts.find((call) => call.url === '/api/dashboard/billing');
    expect(post?.body.action).toBe('invoice.reissue');
    expect(post?.body.payload).toMatchObject({ invoiceId: 'inv-2', expectedVersion: 2, reason: 'koreksi nomor' });
  });

  it('menampilkan unduh pada faktur batal untuk platform', async () => {
    stubBilling('active', VOIDED_INVOICES);
    render(<BillingPanel organizationId="org-1" permissions={['platform.super_admin']} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Faktur' }));
    expect(await screen.findByText(/IND-ORG-2601-0002-CD34/)).toBeDefined();
    expect(screen.getByRole('button', { name: 'Unduh' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Terbitkan ulang' })).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Batalkan' })).toBeNull();
  });

  it('tetap menampilkan unduh pada faktur batal untuk tenant', async () => {
    stubBilling('active', VOIDED_INVOICES);
    render(<BillingPanel organizationId="org-1" permissions={[]} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Faktur' }));
    expect(await screen.findByText(/IND-ORG-2601-0002-CD34/)).toBeDefined();
    expect(screen.getByRole('button', { name: 'Unduh' })).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Terbitkan ulang' })).toBeNull();
  });
});
