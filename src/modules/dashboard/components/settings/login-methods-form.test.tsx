// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { LoginMethodsForm } from '@/modules/dashboard/components/settings/login-methods-form';

const identityMock = vi.hoisted(() => vi.fn());
const passwordMock = vi.hoisted(() => vi.fn());
const linkMock = vi.hoisted(() => vi.fn());

vi.mock('@/integrations/supabase/supabase-browser', () => ({
  createBrowserSupabaseClient: () => ({
    auth: { getUserIdentities: identityMock, updateUser: passwordMock, linkIdentity: linkMock },
  }),
}));

afterEach(() => {
  cleanup();
  identityMock.mockReset();
  passwordMock.mockReset();
  linkMock.mockReset();
});

describe('Formulir metode login', () => {
  it('menawarkan pembuatan kata sandi untuk akun Google', async () => {
    identityMock.mockResolvedValue({ data: { identities: [{ provider: 'google' }] }, error: null });
    render(<LoginMethodsForm />);
    expect(await screen.findByText(/Anda masuk dengan Google/)).toBeDefined();
    expect(screen.getByRole('button', { name: 'Simpan Kata Sandi' })).toBeDefined();
  });

  it('menolak kata sandi yang pendek atau tidak cocok', async () => {
    identityMock.mockResolvedValue({ data: { identities: [{ provider: 'google' }] }, error: null });
    render(<LoginMethodsForm />);
    await screen.findByRole('button', { name: 'Simpan Kata Sandi' });
    fireEvent.change(screen.getByPlaceholderText('Kata sandi baru'), { target: { value: 'pendek' } });
    fireEvent.change(screen.getByPlaceholderText('Konfirmasi kata sandi'), { target: { value: 'berbeda' } });
    fireEvent.submit(screen.getByPlaceholderText('Kata sandi baru').closest('form') as HTMLFormElement);
    expect(await screen.findByText('Kata sandi minimal 8 karakter dan harus sama dengan konfirmasi.')).toBeDefined();
    expect(passwordMock).not.toHaveBeenCalled();
  });

  it('menyimpan kata sandi dan menampilkan pemberitahuan', async () => {
    identityMock.mockResolvedValue({ data: { identities: [{ provider: 'google' }] }, error: null });
    passwordMock.mockResolvedValue({ error: null });
    render(<LoginMethodsForm />);
    await screen.findByRole('button', { name: 'Simpan Kata Sandi' });
    fireEvent.change(screen.getByPlaceholderText('Kata sandi baru'), { target: { value: 'rahasia123' } });
    fireEvent.change(screen.getByPlaceholderText('Konfirmasi kata sandi'), { target: { value: 'rahasia123' } });
    fireEvent.submit(screen.getByPlaceholderText('Kata sandi baru').closest('form') as HTMLFormElement);
    await waitFor(() => expect(passwordMock).toHaveBeenCalledWith({ password: 'rahasia123' }));
    expect(await screen.findByText(/Kata sandi tersimpan/)).toBeDefined();
  });

  it('menawarkan penautan Google untuk akun email', async () => {
    identityMock.mockResolvedValue({ data: { identities: [{ provider: 'email' }] }, error: null });
    linkMock.mockResolvedValue({ error: null });
    render(<LoginMethodsForm />);
    const button = await screen.findByRole('button', { name: 'Tautkan Akun Google' });
    fireEvent.click(button);
    await waitFor(() =>
      expect(linkMock).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'google' }),
      ),
    );
  });
});
