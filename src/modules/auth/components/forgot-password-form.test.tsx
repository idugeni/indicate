// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { ForgotPasswordForm } from '@/modules/auth/components/forgot-password-form';

const resetMock = vi.hoisted(() => vi.fn());

vi.mock('@/integrations/supabase/supabase-browser', () => ({
  createBrowserSupabaseClient: () => ({ auth: { resetPasswordForEmail: resetMock } }),
}));

afterEach(() => {
  cleanup();
  resetMock.mockReset();
});

describe('Formulir lupa kata sandi', () => {
  it('menampilkan galat saat email kosong', async () => {
    render(<ForgotPasswordForm />);
    fireEvent.submit(screen.getByLabelText('Alamat email').closest('form') as HTMLFormElement);
    expect(await screen.findByText('Masukkan alamat email Anda.')).toBeDefined();
    expect(resetMock).not.toHaveBeenCalled();
  });

  it('menampilkan status terkirim setelah tautan berhasil dikirim', async () => {
    resetMock.mockResolvedValueOnce({ error: null });
    render(<ForgotPasswordForm />);
    fireEvent.change(screen.getByLabelText('Alamat email'), { target: { value: 'nama@kabarjateng.org' } });
    fireEvent.submit(screen.getByLabelText('Alamat email').closest('form') as HTMLFormElement);
    expect(await screen.findByText('Tautan pemulihan terkirim')).toBeDefined();
    expect(resetMock).toHaveBeenCalledTimes(1);
  });

  it('meneruskan pesan galat server apa adanya', async () => {
    resetMock.mockResolvedValueOnce({ error: new Error('Email tidak terdaftar') });
    render(<ForgotPasswordForm />);
    fireEvent.change(screen.getByLabelText('Alamat email'), { target: { value: 'asing@kabarjateng.org' } });
    fireEvent.submit(screen.getByLabelText('Alamat email').closest('form') as HTMLFormElement);
    expect(await screen.findByText('Email tidak terdaftar')).toBeDefined();
  });
});
