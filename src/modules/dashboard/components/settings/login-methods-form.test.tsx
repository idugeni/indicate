// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { LoginMethodsForm } from '@/modules/dashboard/components/settings/login-methods-form';

const changePasswordMock = vi.hoisted(() => vi.fn());
vi.mock('@/integrations/neon-auth/client', () => ({
  neonAuthClient: { changePassword: changePasswordMock },
}));

afterEach(() => {
  cleanup();
  changePasswordMock.mockReset();
});

describe('Formulir kata sandi Neon Auth', () => {
  it('menolak kata sandi baru yang pendek atau tidak cocok', async () => {
    render(<LoginMethodsForm />);
    fireEvent.change(screen.getByPlaceholderText('Kata sandi saat ini'), { target: { value: 'lama1234' } });
    fireEvent.change(screen.getByPlaceholderText('Kata sandi baru'), { target: { value: 'pendek' } });
    fireEvent.change(screen.getByPlaceholderText('Konfirmasi kata sandi baru'), { target: { value: 'berbeda' } });
    fireEvent.submit(screen.getByPlaceholderText('Kata sandi saat ini').closest('form') as HTMLFormElement);
    expect(await screen.findByText('Kata sandi baru minimal 8 karakter dan harus sama dengan konfirmasi.')).toBeDefined();
    expect(changePasswordMock).not.toHaveBeenCalled();
  });

  it('menolak kata sandi saat ini yang kosong', async () => {
    render(<LoginMethodsForm />);
    fireEvent.change(screen.getByPlaceholderText('Kata sandi baru'), { target: { value: 'rahasia123' } });
    fireEvent.change(screen.getByPlaceholderText('Konfirmasi kata sandi baru'), { target: { value: 'rahasia123' } });
    fireEvent.submit(screen.getByPlaceholderText('Kata sandi baru').closest('form') as HTMLFormElement);
    expect(await screen.findByText('Masukkan kata sandi saat ini.')).toBeDefined();
    expect(changePasswordMock).not.toHaveBeenCalled();
  });

  it('memperbarui kata sandi dengan Neon dan menampilkan pemberitahuan', async () => {
    changePasswordMock.mockResolvedValueOnce({ error: null });
    render(<LoginMethodsForm />);
    fireEvent.change(screen.getByPlaceholderText('Kata sandi saat ini'), { target: { value: 'lama1234' } });
    fireEvent.change(screen.getByPlaceholderText('Kata sandi baru'), { target: { value: 'rahasia123' } });
    fireEvent.change(screen.getByPlaceholderText('Konfirmasi kata sandi baru'), { target: { value: 'rahasia123' } });
    fireEvent.submit(screen.getByPlaceholderText('Kata sandi saat ini').closest('form') as HTMLFormElement);
    await waitFor(() => expect(changePasswordMock).toHaveBeenCalledWith({
      currentPassword: 'lama1234',
      newPassword: 'rahasia123',
    }));
    expect(await screen.findByText('Kata sandi berhasil diperbarui.')).toBeDefined();
  });

  it('menampilkan galat jika Neon menolak kata sandi saat ini', async () => {
    changePasswordMock.mockResolvedValueOnce({ error: new Error('invalid password') });
    render(<LoginMethodsForm />);
    fireEvent.change(screen.getByPlaceholderText('Kata sandi saat ini'), { target: { value: 'salah1234' } });
    fireEvent.change(screen.getByPlaceholderText('Kata sandi baru'), { target: { value: 'rahasia123' } });
    fireEvent.change(screen.getByPlaceholderText('Konfirmasi kata sandi baru'), { target: { value: 'rahasia123' } });
    fireEvent.submit(screen.getByPlaceholderText('Kata sandi saat ini').closest('form') as HTMLFormElement);
    expect(await screen.findByText(/Gagal memperbarui kata sandi/)).toBeDefined();
  });
});
