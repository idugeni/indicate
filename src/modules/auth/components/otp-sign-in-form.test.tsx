// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { OtpSignInForm } from '@/modules/auth/components/otp-sign-in-form';

const pushMock = vi.hoisted(() => vi.fn());
const refreshMock = vi.hoisted(() => vi.fn());
const otpMock = vi.hoisted(() => vi.fn());
const verifyMock = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

vi.mock('@/integrations/supabase/supabase-browser', () => ({
  createBrowserSupabaseClient: () => ({ auth: { signInWithOtp: otpMock, verifyOtp: verifyMock } }),
}));

afterEach(() => {
  cleanup();
  pushMock.mockReset();
  refreshMock.mockReset();
  otpMock.mockReset();
  verifyMock.mockReset();
  delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
});

describe('Formulir masuk kode OTP', () => {
  it('menolak alamat email yang tidak valid', async () => {
    render(<OtpSignInForm />);
    fireEvent.change(screen.getByLabelText('Alamat email'), { target: { value: 'bukan-email' } });
    fireEvent.submit(screen.getByLabelText('Alamat email').closest('form') as HTMLFormElement);
    expect(await screen.findByText('Masukkan alamat email yang valid.')).toBeDefined();
    expect(otpMock).not.toHaveBeenCalled();
  });

  it('menampilkan tahap kode setelah kode berhasil dikirim', async () => {
    otpMock.mockResolvedValueOnce({ error: null });
    render(<OtpSignInForm />);
    fireEvent.change(screen.getByLabelText('Alamat email'), { target: { value: 'nama@wartanusantara.net' } });
    fireEvent.submit(screen.getByLabelText('Alamat email').closest('form') as HTMLFormElement);
    expect(await screen.findByText(/Kode 8 digit dikirim ke/)).toBeDefined();
    expect(screen.getByText('nama@wartanusantara.net')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Ganti email' })).toBeDefined();
  });

  it('menampilkan galat saat pengiriman kode gagal', async () => {
    otpMock.mockResolvedValueOnce({ error: new Error('kirim gagal') });
    render(<OtpSignInForm />);
    fireEvent.change(screen.getByLabelText('Alamat email'), { target: { value: 'nama@wartanusantara.net' } });
    fireEvent.submit(screen.getByLabelText('Alamat email').closest('form') as HTMLFormElement);
    expect(await screen.findByText('Gagal mengirim kode. Periksa alamat email lalu coba lagi.')).toBeDefined();
  });

  it('kembali ke tahap email saat ganti email diklik', async () => {
    otpMock.mockResolvedValueOnce({ error: null });
    render(<OtpSignInForm />);
    fireEvent.change(screen.getByLabelText('Alamat email'), { target: { value: 'nama@wartanusantara.net' } });
    fireEvent.submit(screen.getByLabelText('Alamat email').closest('form') as HTMLFormElement);
    await screen.findByRole('button', { name: 'Ganti email' });
    fireEvent.click(screen.getByRole('button', { name: 'Ganti email' }));
    expect(screen.getByRole('button', { name: /kirim kode masuk/i })).toBeDefined();
  });

  it('menahan pengiriman kode sampai turnstile terverifikasi', async () => {
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = 'kunci-uji';
    render(<OtpSignInForm />);
    expect(screen.getByRole('button', { name: /kirim kode masuk/i }).hasAttribute('disabled')).toBe(true);
    fireEvent.change(screen.getByLabelText('Alamat email'), { target: { value: 'nama@wartanusantara.net' } });
    fireEvent.submit(screen.getByLabelText('Alamat email').closest('form') as HTMLFormElement);
    expect(await screen.findByText('Selesaikan verifikasi keamanan terlebih dahulu.')).toBeDefined();
    expect(otpMock).not.toHaveBeenCalled();
  });
});
