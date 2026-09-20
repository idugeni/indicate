// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { CustomerManagement } from '@/modules/dashboard/components/customers/customer-management';

afterEach(() => {
  cleanup();
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
    const nama = screen.getByPlaceholderText('Pemerintah Kabupaten Wonosobo');
    fireEvent.change(nama, { target: { value: 'Pemerintah Kabupaten Wonosobo' } });
    fireEvent.blur(nama);
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
      ),
    );
  });

  it('menetapkan admin pertama dan menampilkan pemberitahuan', async () => {
    const command = vi.fn(async () => ({}));
    const { container } = render(<CustomerManagement command={command} />);
    const formulir = container.querySelectorAll('form')[1] as HTMLFormElement;
    fireEvent.change(within(formulir).getByPlaceholderText('ID organisasi'), { target: { value: 'org-1' } });
    fireEvent.change(within(formulir).getByPlaceholderText('admin@organisasi.id'), { target: { value: 'admin@organisasi.id' } });
    fireEvent.submit(formulir);
    await waitFor(() =>
      expect(command).toHaveBeenCalledWith(
        'membership.assign-first',
        expect.objectContaining({ organizationId: 'org-1', userEmail: 'admin@organisasi.id' }),
      ),
    );
    expect(await screen.findByText('Admin pertama berhasil ditetapkan.')).toBeDefined();
  });
});
