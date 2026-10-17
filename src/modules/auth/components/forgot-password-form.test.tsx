// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { ForgotPasswordForm } from '@/modules/auth/components/forgot-password-form';

const resetMock = vi.hoisted(() => vi.fn());
vi.mock('@/integrations/neon-auth/client', () => ({
  neonAuthClient: { requestPasswordReset: resetMock },
}));

afterEach(() => { cleanup(); resetMock.mockReset(); delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY; });

describe('Formulir lupa kata sandi dengan Neon Auth', () => {
  it('menampilkan galat saat email kosong', async () => {
    render(<ForgotPasswordForm />);
    fireEvent.submit(screen.getByLabelText('Alamat email').closest('form') as HTMLFormElement);
    expect(await screen.findByText('Masukkan alamat email Anda.')).toBeDefined();
    expect(resetMock).not.toHaveBeenCalled();
  });

  it('menampilkan status generik setelah permintaan diproses', async () => {
    resetMock.mockResolvedValueOnce({ error: null });
    render(<ForgotPasswordForm />);
    fireEvent.change(screen.getByLabelText('Alamat email'), { target: { value: 'nama@kabarjateng.org' } });
    fireEvent.submit(screen.getByLabelText('Alamat email').closest('form') as HTMLFormElement);
    expect(await screen.findByText('Tautan pemulihan diproses')).toBeDefined();
    expect(resetMock).toHaveBeenCalledTimes(1);
    expect(resetMock.mock.calls[0]?.[0]).toMatchObject({ email: 'nama@kabarjateng.org' });
  });

  it('tidak membocorkan keberadaan akun saat provider mengembalikan galat', async () => {
    resetMock.mockResolvedValueOnce({ error: new Error('provider failure') });
    render(<ForgotPasswordForm />);
    fireEvent.change(screen.getByLabelText('Alamat email'), { target: { value: 'asing@kabarjateng.org' } });
    fireEvent.submit(screen.getByLabelText('Alamat email').closest('form') as HTMLFormElement);
    expect(await screen.findByText(/Jika akun dapat dipulihkan/)).toBeDefined();
  });
});
