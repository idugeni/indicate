// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { SignUpForm } from '@/modules/auth/components/sign-up-form';

const signUpMock = vi.hoisted(() => vi.fn());
vi.mock('next/link', () => ({ default: ({ href, children }: { href: string; children: string }) => <a href={href}>{children}</a> }));
vi.mock('@/integrations/neon-auth/client', () => ({
  neonAuthClient: { signUp: { email: signUpMock } },
}));

afterEach(() => {
  cleanup();
  signUpMock.mockReset();
  delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
});

/** Consent is the last gate before a signup request is sent. */
function acceptTerms() {
  fireEvent.click(screen.getByRole('checkbox', { name: /menyetujui Syarat & Ketentuan/i }));
}

function fillSignup() {
  fireEvent.change(screen.getByLabelText('Nama lengkap'), { target: { value: 'Redaksi Uji' } });
  fireEvent.change(screen.getByLabelText('Alamat email'), { target: { value: 'nama@suarakabar.com' } });
  fireEvent.change(screen.getByLabelText('Kata sandi'), { target: { value: 'rahasia123' } });
}

describe('Formulir daftar akun Neon Auth', () => {
  it('menolak isian yang belum lengkap', async () => {
    render(<SignUpForm />);
    fireEvent.change(screen.getByLabelText('Nama lengkap'), { target: { value: 'Redaksi Uji' } });
    fireEvent.submit(screen.getByLabelText('Nama lengkap').closest('form') as HTMLFormElement);
    expect(await screen.findByText('Lengkapi nama, email, dan kata sandi minimal 8 karakter.')).toBeDefined();
    expect(signUpMock).not.toHaveBeenCalled();
  });

  it('menolak pendaftaran tanpa persetujuan syarat dan privasi', async () => {
    render(<SignUpForm />);
    fillSignup();
    fireEvent.submit(screen.getByLabelText('Nama lengkap').closest('form') as HTMLFormElement);
    expect(await screen.findByText('Setujui Syarat & Ketentuan serta Kebijakan Privasi untuk membuat akun.')).toBeDefined();
    expect(signUpMock).not.toHaveBeenCalled();
  });

  it('mengirim data akun ke Neon dan memakai callback verifikasi first-party', async () => {
    signUpMock.mockResolvedValueOnce({ error: null });
    render(<SignUpForm />);
    fillSignup();
    acceptTerms();
    fireEvent.submit(screen.getByLabelText('Nama lengkap').closest('form') as HTMLFormElement);
    await screen.findByText('Email konfirmasi terkirim');
    expect(signUpMock).toHaveBeenCalledTimes(1);
    expect(signUpMock.mock.calls[0]?.[0]).toMatchObject({
      email: 'nama@suarakabar.com',
      password: 'rahasia123',
      name: 'Redaksi Uji',
      callbackURL: expect.stringContaining('/auth/callback?flow=signup'),
    });
  });

  it('menampilkan status konfirmasi setelah pendaftaran berhasil', async () => {
    signUpMock.mockResolvedValueOnce({ error: null });
    render(<SignUpForm />);
    fillSignup();
    acceptTerms();
    fireEvent.submit(screen.getByLabelText('Nama lengkap').closest('form') as HTMLFormElement);
    expect(await screen.findByText('Email konfirmasi terkirim')).toBeDefined();
  });

  it('meneruskan pesan galat pendaftaran yang ramah', async () => {
    signUpMock.mockResolvedValueOnce({ error: new Error('Email sudah dipakai') });
    render(<SignUpForm />);
    fillSignup();
    acceptTerms();
    fireEvent.submit(screen.getByLabelText('Nama lengkap').closest('form') as HTMLFormElement);
    expect(await screen.findByText('Email sudah dipakai')).toBeDefined();
  });
});
