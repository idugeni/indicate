// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { SignUpForm } from '@/modules/auth/components/sign-up-form';

const signUpMock = vi.hoisted(() => vi.fn());
const oauthMock = vi.hoisted(() => vi.fn());

vi.mock('@/integrations/supabase/supabase-browser', () => ({
  createBrowserSupabaseClient: () => ({ auth: { signUp: signUpMock, signInWithOAuth: oauthMock } }),
}));

afterEach(() => {
  cleanup();
  signUpMock.mockReset();
  oauthMock.mockReset();
});

/** Consent is the last gate before submit, so a complete signup has to tick it. */
function acceptTerms() {
  fireEvent.click(screen.getByRole('checkbox', { name: /menyetujui Syarat & Ketentuan/i }));
}

describe('Formulir daftar akun', () => {
  it('menolak isian yang belum lengkap', async () => {
    render(<SignUpForm />);
    fireEvent.change(screen.getByLabelText('Nama lengkap'), { target: { value: 'Redaksi Uji' } });
    fireEvent.submit(screen.getByLabelText('Nama lengkap').closest('form') as HTMLFormElement);
    expect(await screen.findByText('Lengkapi nama, email, dan kata sandi minimal 8 karakter.')).toBeDefined();
    expect(signUpMock).not.toHaveBeenCalled();
  });

  it('menolak pendaftaran tanpa persetujuan syarat dan privasi', async () => {
    render(<SignUpForm />);
    fireEvent.change(screen.getByLabelText('Nama lengkap'), { target: { value: 'Redaksi Uji' } });
    fireEvent.change(screen.getByLabelText('Alamat email'), { target: { value: 'nama@suarakabar.com' } });
    fireEvent.change(screen.getByLabelText('Kata sandi'), { target: { value: 'rahasia123' } });
    fireEvent.submit(screen.getByLabelText('Nama lengkap').closest('form') as HTMLFormElement);
    expect(await screen.findByText('Setujui Syarat & Ketentuan serta Kebijakan Privasi untuk membuat akun.')).toBeDefined();
    expect(signUpMock).not.toHaveBeenCalled();
  });

  it('mencatat waktu persetujuan saat pendaftaran berhasil', async () => {
    signUpMock.mockResolvedValueOnce({ error: null });
    render(<SignUpForm />);
    fireEvent.change(screen.getByLabelText('Nama lengkap'), { target: { value: 'Redaksi Uji' } });
    fireEvent.change(screen.getByLabelText('Alamat email'), { target: { value: 'nama@suarakabar.com' } });
    fireEvent.change(screen.getByLabelText('Kata sandi'), { target: { value: 'rahasia123' } });
    acceptTerms();
    fireEvent.submit(screen.getByLabelText('Nama lengkap').closest('form') as HTMLFormElement);
    await screen.findByText('Email konfirmasi terkirim');
    const data = (signUpMock.mock.calls[0] as unknown as [
      { options: { data: { display_name: string; terms_accepted_at: string } } },
    ])[0].options.data;
    expect(data.display_name).toBe('Redaksi Uji');
    expect(Number.isNaN(Date.parse(data.terms_accepted_at))).toBe(false);
  });

  it('menampilkan status terkirim setelah pendaftaran berhasil', async () => {
    signUpMock.mockResolvedValueOnce({ error: null });
    render(<SignUpForm />);
    fireEvent.change(screen.getByLabelText('Nama lengkap'), { target: { value: 'Redaksi Uji' } });
    fireEvent.change(screen.getByLabelText('Alamat email'), { target: { value: 'nama@suarakabar.com' } });
    fireEvent.change(screen.getByLabelText('Kata sandi'), { target: { value: 'rahasia123' } });
    acceptTerms();
    fireEvent.submit(screen.getByLabelText('Nama lengkap').closest('form') as HTMLFormElement);
    expect(await screen.findByText('Email konfirmasi terkirim')).toBeDefined();
  });

  it('meneruskan pesan galat server apa adanya', async () => {
    signUpMock.mockResolvedValueOnce({ error: new Error('Email sudah dipakai') });
    render(<SignUpForm />);
    fireEvent.change(screen.getByLabelText('Nama lengkap'), { target: { value: 'Redaksi Uji' } });
    fireEvent.change(screen.getByLabelText('Alamat email'), { target: { value: 'nama@suarakabar.com' } });
    fireEvent.change(screen.getByLabelText('Kata sandi'), { target: { value: 'rahasia123' } });
    acceptTerms();
    fireEvent.submit(screen.getByLabelText('Nama lengkap').closest('form') as HTMLFormElement);
    expect(await screen.findByText('Email sudah dipakai')).toBeDefined();
  });
});
