// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { UpdatePasswordForm } from '@/modules/auth/components/update-password-form';

const pushMock = vi.hoisted(() => vi.fn());
const refreshMock = vi.hoisted(() => vi.fn());
const updateMock = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

vi.mock('@/integrations/supabase/supabase-browser', () => ({
  createBrowserSupabaseClient: () => ({ auth: { updateUser: updateMock } }),
}));

afterEach(() => {
  cleanup();
  pushMock.mockReset();
  refreshMock.mockReset();
  updateMock.mockReset();
  delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
});

describe('Formulir perbarui kata sandi', () => {
  it('menolak kata sandi yang terlalu pendek', async () => {
    render(<UpdatePasswordForm />);
    fireEvent.change(screen.getByLabelText('Kata sandi baru'), { target: { value: 'pendek' } });
    fireEvent.change(screen.getByLabelText('Konfirmasi kata sandi'), { target: { value: 'pendek' } });
    fireEvent.submit(screen.getByLabelText('Kata sandi baru').closest('form') as HTMLFormElement);
    expect(await screen.findByText('Kata sandi minimal 8 karakter.')).toBeDefined();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('menolak konfirmasi yang tidak cocok', async () => {
    render(<UpdatePasswordForm />);
    fireEvent.change(screen.getByLabelText('Kata sandi baru'), { target: { value: 'rahasia123' } });
    fireEvent.change(screen.getByLabelText('Konfirmasi kata sandi'), { target: { value: 'berbeda123' } });
    fireEvent.submit(screen.getByLabelText('Kata sandi baru').closest('form') as HTMLFormElement);
    expect(await screen.findByText('Konfirmasi kata sandi tidak cocok.')).toBeDefined();
  });

  it('menampilkan status berhasil setelah kata sandi diperbarui', async () => {
    updateMock.mockResolvedValueOnce({ error: null });
    render(<UpdatePasswordForm />);
    fireEvent.change(screen.getByLabelText('Kata sandi baru'), { target: { value: 'rahasia123' } });
    fireEvent.change(screen.getByLabelText('Konfirmasi kata sandi'), { target: { value: 'rahasia123' } });
    fireEvent.submit(screen.getByLabelText('Kata sandi baru').closest('form') as HTMLFormElement);
    expect(await screen.findByText('Kata sandi diperbarui')).toBeDefined();
  });

  it('menahan penyimpanan sampai turnstile terverifikasi', async () => {
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = 'kunci-uji';
    render(<UpdatePasswordForm />);
    expect(screen.getByRole('button', { name: /simpan kata sandi/i }).hasAttribute('disabled')).toBe(true);
    fireEvent.change(screen.getByLabelText('Kata sandi baru'), { target: { value: 'rahasia123' } });
    fireEvent.change(screen.getByLabelText('Konfirmasi kata sandi'), { target: { value: 'rahasia123' } });
    fireEvent.submit(screen.getByLabelText('Kata sandi baru').closest('form') as HTMLFormElement);
    expect(await screen.findByText('Selesaikan verifikasi keamanan terlebih dahulu.')).toBeDefined();
    expect(updateMock).not.toHaveBeenCalled();
  });
});
