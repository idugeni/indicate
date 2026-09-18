// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { LoginMethodsForm } from '@/modules/dashboard/components/settings/login-methods-form';

const identitasMock = vi.hoisted(() => vi.fn());
const sandiMock = vi.hoisted(() => vi.fn());
const tautMock = vi.hoisted(() => vi.fn());

vi.mock('@/integrations/supabase/supabase-browser', () => ({
  createBrowserSupabaseClient: () => ({
    auth: { getUserIdentities: identitasMock, updateUser: sandiMock, linkIdentity: tautMock },
  }),
}));

afterEach(() => {
  cleanup();
  identitasMock.mockReset();
  sandiMock.mockReset();
  tautMock.mockReset();
});

describe('Formulir metode login', () => {
  it('menawarkan pembuatan kata sandi untuk akun Google', async () => {
    identitasMock.mockResolvedValue({ data: { identities: [{ provider: 'google' }] }, error: null });
    render(<LoginMethodsForm />);
    expect(await screen.findByText(/Anda masuk dengan Google/)).toBeDefined();
    expect(screen.getByRole('button', { name: 'Simpan Kata Sandi' })).toBeDefined();
  });

  it('menolak kata sandi yang pendek atau tidak cocok', async () => {
    identitasMock.mockResolvedValue({ data: { identities: [{ provider: 'google' }] }, error: null });
    render(<LoginMethodsForm />);
    await screen.findByRole('button', { name: 'Simpan Kata Sandi' });
    fireEvent.change(screen.getByPlaceholderText('Kata sandi baru'), { target: { value: 'pendek' } });
    fireEvent.change(screen.getByPlaceholderText('Konfirmasi kata sandi'), { target: { value: 'berbeda' } });
    fireEvent.submit(screen.getByPlaceholderText('Kata sandi baru').closest('form') as HTMLFormElement);
    expect(await screen.findByText('Kata sandi minimal 8 karakter dan harus sama dengan konfirmasi.')).toBeDefined();
    expect(sandiMock).not.toHaveBeenCalled();
  });

  it('menyimpan kata sandi dan menampilkan pemberitahuan', async () => {
    identitasMock.mockResolvedValue({ data: { identities: [{ provider: 'google' }] }, error: null });
    sandiMock.mockResolvedValue({ error: null });
    render(<LoginMethodsForm />);
    await screen.findByRole('button', { name: 'Simpan Kata Sandi' });
    fireEvent.change(screen.getByPlaceholderText('Kata sandi baru'), { target: { value: 'rahasia123' } });
    fireEvent.change(screen.getByPlaceholderText('Konfirmasi kata sandi'), { target: { value: 'rahasia123' } });
    fireEvent.submit(screen.getByPlaceholderText('Kata sandi baru').closest('form') as HTMLFormElement);
    await waitFor(() => expect(sandiMock).toHaveBeenCalledWith({ password: 'rahasia123' }));
    expect(await screen.findByText(/Kata sandi tersimpan/)).toBeDefined();
  });

  it('menawarkan penautan Google untuk akun email', async () => {
    identitasMock.mockResolvedValue({ data: { identities: [{ provider: 'email' }] }, error: null });
    tautMock.mockResolvedValue({ error: null });
    render(<LoginMethodsForm />);
    const tombol = await screen.findByRole('button', { name: 'Tautkan Akun Google' });
    fireEvent.click(tombol);
    await waitFor(() =>
      expect(tautMock).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'google' }),
      ),
    );
  });
});
