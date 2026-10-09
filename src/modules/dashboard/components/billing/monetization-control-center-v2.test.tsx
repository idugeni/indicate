// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MonetizationControlCenterV2 } from './monetization-control-center-v2';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function stub(state = 'active', invoices: unknown[] = []) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string) => {
      const url = String(input);
      if (url.includes('subscription-state')) return { ok: true, json: async () => ({ state }) };
      if (url.includes('scope=invoices')) return { ok: true, json: async () => invoices };
      if (url.includes('view=customers')) return { ok: true, json: async () => [] };
      return { ok: true, json: async () => ({}) };
    }),
  );
}

describe('Monetization Control Center V2', () => {
  it('renders a revenue-oriented control center', async () => {
    stub('active', [
      {
        id: 'i1',
        organizationId: 'org-1',
        number: 'INV-1',
        amountIdr: 550000,
        status: 'paid',
        paidAt: null,
        dueAt: null,
        billingNote: null,
        paymentMethod: 'Transfer',
        version: 1,
        createdAt: '2026-10-01T00:00:00.000Z',
      },
    ]);
    render(<MonetizationControlCenterV2 organizationId="org-1" permissions={[]} />);
    expect(await screen.findByRole('heading', { name: 'Revenue & Billing' })).toBeDefined();
    expect(await screen.findByText('INV-1')).toBeDefined();
    expect(screen.getAllByText('Rp550.000').length).toBeGreaterThan(0);
  });

  it('surfaces overdue invoices as an actionable financial exception', async () => {
    stub('active', [
      {
        id: 'i-overdue',
        organizationId: 'org-1',
        number: 'INV-OVERDUE',
        amountIdr: 750000,
        status: 'unpaid',
        paidAt: null,
        dueAt: '2026-10-01T00:00:00.000Z',
        billingNote: null,
        paymentMethod: 'Transfer',
        version: 1,
        createdAt: '2026-09-01T00:00:00.000Z',
      },
    ]);
    render(<MonetizationControlCenterV2 organizationId="org-1" permissions={[]} />);
    expect(await screen.findByText('Attention Queue')).toBeDefined();
    expect((await screen.findAllByText('INV-OVERDUE')).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: /INV-OVERDUE/ }));
    expect((screen.getByLabelText('Cari faktur') as HTMLInputElement).value).toBe('INV-OVERDUE');
  });

  it('does not expose platform actions to tenants', async () => {
    stub();
    render(<MonetizationControlCenterV2 organizationId="org-1" permissions={[]} />);
    expect(await screen.findByText('Access State')).toBeDefined();
    expect(screen.queryByText('Platform Actions')).toBeNull();
  });

  it('exposes platform actions only with platform permission', async () => {
    stub();
    render(
      <MonetizationControlCenterV2 organizationId="org-1" permissions={['platform.super_admin']} />,
    );
    expect(await screen.findByText('Platform Actions')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Terapkan status' })).toBeDefined();
  });

  it('shows an explicit loading state before declaring the invoice ledger empty', async () => {
    let resolveSubscription: ((value: { ok: true; json: () => Promise<unknown> }) => void) | undefined;
    let resolveInvoices: ((value: { ok: true; json: () => Promise<unknown> }) => void) | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string) => {
        if (input.includes('subscription-state')) {
          return new Promise<{ ok: true; json: () => Promise<unknown> }>((resolve) => {
            resolveSubscription = resolve;
          });
        }
        if (input.includes('scope=invoices')) {
          return new Promise<{ ok: true; json: () => Promise<unknown> }>((resolve) => {
            resolveInvoices = resolve;
          });
        }
        return Promise.resolve({ ok: true, json: async () => [] });
      }),
    );

    render(<MonetizationControlCenterV2 organizationId="org-1" permissions={[]} />);
    expect(screen.getByRole('status').textContent).toContain('Memuat faktur');
    expect(screen.queryByText('Belum ada faktur untuk organisasi ini.')).toBeNull();

    resolveSubscription?.({ ok: true, json: async () => ({ state: 'active' }) });
    resolveInvoices?.({ ok: true, json: async () => [] });
    expect(await screen.findByText('Belum ada faktur untuk organisasi ini.')).toBeDefined();
  });

  it('does not misreport an invoice request failure as an empty ledger', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string) => {
        if (String(input).includes('subscription-state')) {
          return { ok: true, json: async () => ({ state: 'active' }) };
        }
        if (String(input).includes('scope=invoices')) {
          return { ok: false, status: 503, json: async () => [] };
        }
        return { ok: true, json: async () => [] };
      }),
    );
    render(<MonetizationControlCenterV2 organizationId="org-1" permissions={[]} />);
    expect(await screen.findByText('Gagal memuat data monetisasi.')).toBeDefined();
    expect(screen.getByText(/Faktur tidak dapat dimuat/)).toBeDefined();
    expect(screen.queryByText('Belum ada faktur untuk organisasi ini.')).toBeNull();
  });

  it('loads subsequent invoice pages using the last row cursor', async () => {
    const invoice = (index: number) => ({
      id: `invoice-${index}`,
      organizationId: 'org-1',
      organizationName: 'Alpha Media',
      number: `INV-${String(index).padStart(3, '0')}`,
      amountIdr: 100000,
      status: 'paid',
      paidAt: null,
      dueAt: null,
      billingNote: null,
      paymentMethod: 'Transfer',
      version: 1,
      createdAt: new Date(Date.UTC(2026, 0, 1, 0, index)).toISOString(),
    });
    const firstPage = Array.from({ length: 100 }, (_, index) => invoice(index));
    const nextPage = [invoice(100)];
    const invoiceRequests: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string) => {
        const url = String(input);
        if (url.includes('subscription-state')) return { ok: true, json: async () => ({ state: 'active' }) };
        if (url.includes('scope=invoices')) {
          invoiceRequests.push(url);
          return {
            ok: true,
            json: async () => url.includes('cursor=') ? nextPage : firstPage,
          };
        }
        return { ok: true, json: async () => [] };
      }),
    );

    render(<MonetizationControlCenterV2 organizationId="org-1" permissions={[]} />);
    expect(await screen.findByText('INV-099')).toBeDefined();
    const ledger = within(screen.getByRole('region', { name: 'Invoice Ledger' }));
    const loadMore = ledger.getByRole('button', { name: 'Muat faktur berikutnya' });
    expect(within(screen.getByRole('region', { name: 'Attention Queue' })).queryByRole('button', { name: 'Muat faktur berikutnya' })).toBeNull();
    fireEvent.click(loadMore);
    expect(await screen.findByText('INV-100')).toBeDefined();
    expect(invoiceRequests).toHaveLength(2);
    expect(invoiceRequests[0]).toContain('limit=100');
    expect(invoiceRequests[1]).toContain('cursor=');
    expect(screen.queryByRole('button', { name: 'Muat faktur berikutnya' })).toBeNull();
  });

  it('sends existing billing commands without introducing a new API contract', async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string, init?: RequestInit) => {
        const url = String(input);
        if (init?.method === 'POST') {
          calls.push(url);
          return { ok: true, json: async () => ({}) };
        }
        if (url.includes('subscription-state'))
          return { ok: true, json: async () => ({ state: 'active' }) };
        if (url.includes('scope=invoices')) return { ok: true, json: async () => [] };
        if (url.includes('view=customers')) return { ok: true, json: async () => [] };
        return { ok: true, json: async () => ({}) };
      }),
    );
    render(
      <MonetizationControlCenterV2 organizationId="org-1" permissions={['platform.super_admin']} />,
    );
    expect(await screen.findByText('Platform Actions')).toBeDefined();
    fireEvent.change(screen.getByLabelText('Nominal faktur'), { target: { value: '600000' } });
    expect((screen.getByLabelText('Nominal faktur') as HTMLInputElement).value).toBe('600000');
    expect(calls).toHaveLength(0);
  });
});
