// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { IntegrationSettings } from '@/modules/dashboard/components/settings/integration-settings';

vi.mock('sonner', async () => (await import('@/test/stubs/sonner')).sonnerStub());

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Pengaturan integrasi', () => {
  it('merender dua panel dengan status email nonaktif', () => {
    render(<IntegrationSettings command={vi.fn(async () => ({}))} />);
    expect(screen.getByText('Kunci API')).toBeDefined();
    expect(screen.queryByText('Telegram')).toBeNull();
    expect(screen.getByText('Surel Transaksi')).toBeDefined();
    expect(screen.getByText('Nonaktif')).toBeDefined();
  });

  it('menerbitkan kunci API dan menampilkan rahasia sekali lihat', async () => {
    const command = vi.fn(async () => ({ plaintext: 'kunci-rahasia-uji' }));
    const { container } = render(<IntegrationSettings command={command} />);
    fireEvent.change(screen.getByLabelText('Nama kunci'), {
      target: { value: 'Layanan Uji' },
    });
    fireEvent.submit(container.querySelectorAll('form')[0] as HTMLFormElement);
    await waitFor(() =>
      expect(command).toHaveBeenCalledWith(
        'api-key.issue',
        expect.objectContaining({ name: 'Layanan Uji' }),
        { refresh: true },
      ),
    );
    expect(await screen.findByText('kunci-rahasia-uji')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Salin kunci API' })).toBeDefined();
  });

  it('menyalin kunci API dan memberi tahu lewat toast', async () => {
    const writeText = vi.fn(async () => {});
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    const command = vi.fn(async () => ({ plaintext: 'kunci-rahasia-uji' }));
    const { container } = render(<IntegrationSettings command={command} />);
    fireEvent.change(screen.getByLabelText('Nama kunci'), {
      target: { value: 'Layanan Uji' },
    });
    fireEvent.submit(container.querySelectorAll('form')[0] as HTMLFormElement);
    expect(await screen.findByText('kunci-rahasia-uji')).toBeDefined();
    const { toast } = await import('sonner');
    fireEvent.click(screen.getByRole('button', { name: 'Salin kunci API' }));
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('kunci-rahasia-uji');
      expect(toast.success).toHaveBeenCalledWith('Kunci API tersalin.');
    });
  });

  it('menambah hak akses lalu mengirimkannya', async () => {
    const command = vi.fn(async () => ({ plaintext: 'kunci-rahasia-uji' }));
    const { container } = render(<IntegrationSettings command={command} />);
    expect(screen.getByText('article.read')).toBeDefined();
    expect(screen.getByText('publishing.read')).toBeDefined();

    fireEvent.change(screen.getByLabelText('Tambah hak akses'), { target: { value: 'sites.manage' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tambah' }));
    expect(await screen.findByText('sites.manage')).toBeDefined();

    fireEvent.change(screen.getByLabelText('Nama kunci'), { target: { value: 'Layanan Uji' } });
    fireEvent.submit(container.querySelectorAll('form')[0] as HTMLFormElement);
    await waitFor(() =>
      expect(command).toHaveBeenCalledWith(
        'api-key.issue',
        expect.objectContaining({ scopes: ['article.read', 'publishing.read', 'sites.manage'] }),
        { refresh: true },
      ),
    );
  });

  it('menghapus hak akses lewat chip', async () => {
    render(<IntegrationSettings command={vi.fn(async () => ({}))} />);
    fireEvent.click(screen.getByRole('button', { name: 'Hapus hak akses article.read' }));
    await waitFor(() => expect(screen.queryByText('article.read')).toBeNull());
    expect(screen.getByText('publishing.read')).toBeDefined();
  });

  it('menambah hak akses dari tombol Enter tanpa klik', async () => {
    render(<IntegrationSettings command={vi.fn(async () => ({}))} />);
    const field = screen.getByLabelText('Tambah hak akses');
    fireEvent.change(field, { target: { value: 'domains.manage' } });
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(await screen.findByText('domains.manage')).toBeDefined();
  });

  it('menolak menerbitkan tanpa hak akses', async () => {
    const command = vi.fn(async () => ({ plaintext: 'kunci-rahasia-uji' }));
    const { container } = render(<IntegrationSettings command={command} />);
    fireEvent.change(screen.getByLabelText('Nama kunci'), { target: { value: 'Layanan Uji' } });
    fireEvent.click(screen.getByRole('button', { name: 'Hapus hak akses article.read' }));
    fireEvent.click(screen.getByRole('button', { name: 'Hapus hak akses publishing.read' }));
    expect(screen.getByText(/minimal satu hak akses/i)).toBeDefined();
    const submit = screen.getByRole('button', { name: 'Terbitkan Kunci API' }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    fireEvent.submit(container.querySelectorAll('form')[0] as HTMLFormElement);
    expect(command).not.toHaveBeenCalled();
  });

  it('mengirim email uji saat layanan terkonfigurasi', async () => {
    const command = vi.fn(async () => ({ id: 'abc12345-pesan-uji' }));
    render(
      <IntegrationSettings
        command={command}
        isPlatform
        email={{ configured: true, defaultFrom: 'noreply@contoh.id', webhook: false }}
      />,
    );
    expect(screen.getByText('Aktif (Resend)')).toBeDefined();
    fireEvent.change(screen.getByLabelText('Alamat surel uji'), { target: { value: 'uji@contoh.id' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kirim uji' }));
    await waitFor(() => expect(command).toHaveBeenCalledWith('email.test', { to: 'uji@contoh.id' }));
    expect(await screen.findByText('Surel uji terkirim.')).toBeDefined();
  });
});
