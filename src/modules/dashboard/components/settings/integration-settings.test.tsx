// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { IntegrationSettings } from '@/modules/dashboard/components/settings/integration-settings';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Pengaturan integrasi', () => {
  it('merender tiga panel dengan status email nonaktif', () => {
    render(<IntegrationSettings command={vi.fn(async () => ({}))} />);
    expect(screen.getByText('Kunci API')).toBeDefined();
    expect(screen.getByText('Telegram dispatcher')).toBeDefined();
    expect(screen.getByText('Email transaksional')).toBeDefined();
    expect(screen.getByText('Nonaktif')).toBeDefined();
  });

  it('menerbitkan kunci API dan menampilkan rahasia sekali lihat', async () => {
    const command = vi.fn(async () => ({ plaintext: 'kunci-rahasia-uji' }));
    const { container } = render(<IntegrationSettings command={command} />);
    fireEvent.change(screen.getByLabelText('Nama Pengenal Kunci (Label)'), {
      target: { value: 'Layanan Uji' },
    });
    fireEvent.submit(container.querySelectorAll('form')[0] as HTMLFormElement);
    await waitFor(() =>
      expect(command).toHaveBeenCalledWith(
        'api-key.issue',
        expect.objectContaining({ name: 'Layanan Uji' }),
      ),
    );
    expect(await screen.findByText('kunci-rahasia-uji')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Salin API Key' })).toBeDefined();
  });

  it('menautkan kanal telegram lewat command', async () => {
    const command = vi.fn(async () => ({}));
    const { container } = render(<IntegrationSettings command={command} />);
    fireEvent.change(screen.getByLabelText('User ID'), { target: { value: 'usr-1' } });
    fireEvent.change(screen.getByLabelText('Role ID'), { target: { value: 'role-1' } });
    fireEvent.change(screen.getByLabelText('Telegram User ID'), { target: { value: '109283746' } });
    fireEvent.change(screen.getByLabelText('Telegram Chat ID'), { target: { value: '-100987654321' } });
    fireEvent.submit(container.querySelectorAll('form')[1] as HTMLFormElement);
    await waitFor(() =>
      expect(command).toHaveBeenCalledWith(
        'telegram-mapping.create',
        expect.objectContaining({ userId: 'usr-1', telegramChatId: '-100987654321' }),
      ),
    );
  });

  it('mengantrekan broadcast platform setelah konfirmasi', async () => {
    const command = vi.fn(async () => ({ enqueued: 2 }));
    vi.stubGlobal('confirm', vi.fn(() => true));
    render(<IntegrationSettings command={command} isPlatform />);
    const area = screen.getByLabelText('Teks broadcast');
    expect((screen.getByRole('button', { name: 'Antrekan broadcast' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(area, { target: { value: 'Pengumuman penting' } });
    fireEvent.click(screen.getByRole('button', { name: 'Antrekan broadcast' }));
    await waitFor(() =>
      expect(command).toHaveBeenCalledWith('telegram.broadcast', { text: 'Pengumuman penting' }),
    );
    expect(await screen.findByText('Broadcast diantrekan ke 2 kanal.')).toBeDefined();
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
    fireEvent.change(screen.getByLabelText('Alamat email uji'), { target: { value: 'uji@contoh.id' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kirim uji' }));
    await waitFor(() => expect(command).toHaveBeenCalledWith('email.test', { to: 'uji@contoh.id' }));
    expect(await screen.findByText(/Email uji terkirim \(id abc12345/)).toBeDefined();
  });
});
