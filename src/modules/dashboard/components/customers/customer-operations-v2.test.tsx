// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { CustomerOperationsV2 } from './customer-operations-v2';

vi.mock('@/modules/dashboard/components/customers/customer-management', () => ({
  CustomerManagement: () => <div data-testid="customer-actions">Customer actions</div>,
}));

afterEach(cleanup);

const customers = [
  {
    customer: {
      id: 'org-1',
      name: 'Alpha Media',
      slug: 'alpha-media',
      status: 'active',
      customerMetadata: { plan: 'pro' },
      version: 3,
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-08T18:00:00.000Z',
    },
    subscription: {
      organizationId: 'org-1',
      status: 'active',
      version: 2,
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-08T18:00:00.000Z',
    },
  },
  {
    customer: {
      id: 'org-2',
      name: 'Beta News',
      slug: 'beta-news',
      status: 'inactive',
      customerMetadata: {},
      version: 1,
      createdAt: '2026-10-02T00:00:00.000Z',
      updatedAt: '2026-10-07T18:00:00.000Z',
    },
    subscription: {
      organizationId: 'org-2',
      status: 'past_due',
      version: 4,
      createdAt: '2026-10-02T00:00:00.000Z',
      updatedAt: '2026-10-07T18:00:00.000Z',
    },
  },
];

describe('CustomerOperationsV2', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('customerId=org-1'))
          return new Response(JSON.stringify(customers[0]), { status: 200 });
        if (url.includes('customerId=org-2'))
          return new Response(JSON.stringify(customers[1]), { status: 200 });
        return new Response(JSON.stringify(customers), { status: 200 });
      }),
    );
  });

  it('renders Customer 360 instead of generic customer CRUD tables', async () => {
    render(<CustomerOperationsV2 organizationId="platform" command={vi.fn(async () => null)} />);
    expect(await screen.findByRole('heading', { name: 'Customer 360', level: 1 })).toBeDefined();
    expect(screen.getByRole('button', { name: /Customer Directory/ })).toBeDefined();
    expect(screen.queryByText('Organisasi Baru')).toBeNull();
  });

  it('filters the directory and opens a customer 360 detail', async () => {
    render(<CustomerOperationsV2 organizationId="platform" command={vi.fn(async () => null)} />);
    expect(await screen.findByText('Alpha Media')).toBeDefined();
    fireEvent.change(screen.getByLabelText('Cari customer'), { target: { value: 'beta' } });
    expect(screen.queryByText('Alpha Media')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Beta News/ }));
    expect(screen.getByRole('heading', { name: 'Customer 360', level: 1 })).toBeDefined();
    expect((await screen.findAllByText('past_due')).length).toBeGreaterThan(0);
  });

  it('loads customer directory cursor pages without duplicating rows', async () => {
    const calls: string[] = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      calls.push(url);
      if (url.includes('cursor=cursor-1')) return new Response(JSON.stringify([customers[1]]), { status: 200 });
      return new Response(JSON.stringify([customers[0]]), {
        status: 200,
        headers: { 'X-Next-Cursor': 'cursor-1' },
      });
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<CustomerOperationsV2 organizationId="platform" command={vi.fn(async () => null)} />);

    expect(await screen.findByText('Alpha Media')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Muat customer berikutnya' }));
    expect(await screen.findByText('Beta News')).toBeDefined();
    expect(calls.some((url) => url.includes('limit=100&cursor=cursor-1'))).toBe(true);
    expect(screen.queryByRole('button', { name: 'Muat customer berikutnya' })).toBeNull();
  });

  it('keeps account actions as a focused implementation surface', async () => {
    render(<CustomerOperationsV2 organizationId="platform" command={vi.fn(async () => null)} />);
    fireEvent.click(screen.getByRole('button', { name: /Account Actions/ }));
    expect(screen.getByTestId('customer-actions')).toBeDefined();
  });
});
