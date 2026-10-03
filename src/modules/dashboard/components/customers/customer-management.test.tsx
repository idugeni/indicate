// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { clearEndpointCache } from '@/modules/dashboard/components/shared/endpoint-cache';
import { CustomerManagement } from '@/modules/dashboard/components/customers/customer-management';

function stubCustomers() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      json: async () => [
        {
          customer: { id: 'org-9', name: 'Pemkab Wonosobo', slug: 'pemkab-wonosobo' },
          subscription: null,
        },
      ],
    })),
  );
}

afterEach(() => {
  cleanup();
  clearEndpointCache();
});

describe('Manajemen pelanggan', () => {
  it('merender tiga kartu utama', () => {
    render(<CustomerManagement command={vi.fn(async () => ({}))} />);
    expect(screen.getByText('Organisasi Baru')).toBeDefined();
    expect(screen.getByText('Admin pertama')).toBeDefined();
    expect(screen.getByText('Undangan organisasi')).toBeDefined();
  });

  it('mengisi slug otomatis dari nama saat blur', () => {
    render(<CustomerManagement command={vi.fn(async () => ({}))} />);
    const nameInput = screen.getByPlaceholderText('Pemerintah Kabupaten Wonosobo');
    fireEvent.change(nameInput, { target: { value: 'Pemerintah Kabupaten Wonosobo' } });
    fireEvent.blur(nameInput);
    expect((screen.getByPlaceholderText('pemkab-wonosobo') as HTMLInputElement).value).toBe(
      'pemerintah-kabupaten-wonosobo',
    );
  });

  it('membuat tenant baru lewat command', async () => {
    const command = vi.fn(async () => ({}));
    const { container } = render(<CustomerManagement command={command} />);
    fireEvent.change(screen.getByPlaceholderText('Pemerintah Kabupaten Wonosobo'), {
      target: { value: 'Dinas Kominfo' },
    });
    fireEvent.change(screen.getByPlaceholderText('pemkab-wonosobo'), { target: { value: 'dinas-kominfo' } });
    fireEvent.submit(container.querySelectorAll('form')[0] as HTMLFormElement);
    await waitFor(() =>
      expect(command).toHaveBeenCalledWith(
        'customer.create',
        expect.objectContaining({ name: 'Dinas Kominfo', slug: 'dinas-kominfo', subscription: { status: 'suspended' } }),
        { refresh: true },
      ),
    );
  });

  it('menetapkan admin pertama dan menampilkan pemberitahuan', async () => {
    const command = vi.fn(async () => ({}));
    const { container } = render(<CustomerManagement command={command} />);
    const form = container.querySelectorAll('form')[1] as HTMLFormElement;
    fireEvent.change(within(form).getByPlaceholderText('ID organisasi'), { target: { value: 'org-1' } });
    fireEvent.change(within(form).getByPlaceholderText('admin@organisasi.id'), { target: { value: 'admin@organisasi.id' } });
    fireEvent.submit(form);
    await waitFor(() =>
      expect(command).toHaveBeenCalledWith(
        'membership.assign-first',
        expect.objectContaining({ organizationId: 'org-1', userEmail: 'admin@organisasi.id' }),
        { refresh: true },
      ),
    );
    expect(await screen.findByText('Admin pertama berhasil ditetapkan.')).toBeDefined();
  });

  it('memilih organisasi lewat combobox saat daftar tersedia', async () => {
    const user = userEvent.setup();
    stubCustomers();
    const command = vi.fn(async () => ({}));
    const { container } = render(<CustomerManagement command={command} organizationId="org-0" />);
    const form = container.querySelectorAll('form')[1] as HTMLFormElement;
    await user.click(await within(form).findByPlaceholderText('Cari organisasi…'));
    await user.click(await screen.findByRole('option', { name: 'Pemkab Wonosobo · pemkab-wonosobo' }));
    fireEvent.change(within(form).getByPlaceholderText('admin@organisasi.id'), { target: { value: 'admin@organisasi.id' } });
    fireEvent.submit(form);
    await waitFor(() =>
      expect(command).toHaveBeenCalledWith(
        'membership.assign-first',
        expect.objectContaining({ organizationId: 'org-9', userEmail: 'admin@organisasi.id' }),
        { refresh: true },
      ),
    );
  });
});
