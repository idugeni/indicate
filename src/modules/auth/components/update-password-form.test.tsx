// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { UpdatePasswordForm } from '@/modules/auth/components/update-password-form';

const pushMock = vi.hoisted(() => vi.fn());
const refreshMock = vi.hoisted(() => vi.fn());
const resetPasswordMock = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock, refresh: refreshMock }) }));
vi.mock('@/integrations/neon-auth/client', () => ({
  neonAuthClient: { resetPassword: resetPasswordMock },
}));

afterEach(() => {
  cleanup();
  pushMock.mockReset();
  refreshMock.mockReset();
  resetPasswordMock.mockReset();
  window.history.replaceState({}, '', '/update-password');
});

describe('Formulir perbarui kata sandi Neon Auth', () => {
  it('menolak kata sandi yang terlalu pendek', async () => {
    render(<UpdatePasswordForm />);
    fireEvent.change(screen.getByLabelText('Kata sandi baru'), { target: { value: 'pendek' } });
    fireEvent.change(screen.getByLabelText('Konfirmasi kata sandi'), { target: { value: 'pendek' } });
    fireEvent.submit(screen.getByLabelText('Kata sandi baru').closest('form') as HTMLFormElement);
    expect(await screen.findByText('Kata sandi minimal 8 karakter.')).toBeDefined();
    expect(resetPasswordMock).not.toHaveBeenCalled();
  });

  it('menolak konfirmasi yang tidak cocok', async () => {
    render(<UpdatePasswordForm />);
    fireEvent.change(screen.getByLabelText('Kata sandi baru'), { target: { value: 'rahasia123' } });
    fireEvent.change(screen.getByLabelText('Konfirmasi kata sandi'), { target: { value: 'berbeda123' } });
    fireEvent.submit(screen.getByLabelText('Kata sandi baru').closest('form') as HTMLFormElement);
    expect(await screen.findByText('Konfirmasi kata sandi tidak cocok.')).toBeDefined();
  });

  it('menolak jika token reset tidak tersedia', async () => {
    render(<UpdatePasswordForm />);
    fireEvent.change(screen.getByLabelText('Kata sandi baru'), { target: { value: 'rahasia123' } });
    fireEvent.change(screen.getByLabelText('Konfirmasi kata sandi'), { target: { value: 'rahasia123' } });
    fireEvent.submit(screen.getByLabelText('Kata sandi baru').closest('form') as HTMLFormElement);
    expect(await screen.findByText(/Tautan pemulihan tidak valid/)).toBeDefined();
    expect(resetPasswordMock).not.toHaveBeenCalled();
  });

  it('memperbarui kata sandi dengan token dari link', async () => {
    window.history.replaceState({}, '', '/update-password?token=valid-reset-token');
    resetPasswordMock.mockResolvedValueOnce({ error: null });
    render(<UpdatePasswordForm />);
    fireEvent.change(screen.getByLabelText('Kata sandi baru'), { target: { value: 'rahasia123' } });
    fireEvent.change(screen.getByLabelText('Konfirmasi kata sandi'), { target: { value: 'rahasia123' } });
    fireEvent.submit(screen.getByLabelText('Kata sandi baru').closest('form') as HTMLFormElement);
    expect(await screen.findByText('Kata sandi diperbarui')).toBeDefined();
    expect(resetPasswordMock).toHaveBeenCalledWith({ newPassword: 'rahasia123', token: 'valid-reset-token' });
  });
});
