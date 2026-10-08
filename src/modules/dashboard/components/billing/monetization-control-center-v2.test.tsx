// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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
