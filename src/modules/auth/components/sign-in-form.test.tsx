// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { SignInForm } from '@/modules/auth/components/sign-in-form';

const pushMock = vi.hoisted(() => vi.fn());
const refreshMock = vi.hoisted(() => vi.fn());
const passwordMock = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: string }) => <a href={href}>{children}</a>,
}));

vi.mock('@/integrations/supabase/supabase-browser', () => ({
  createBrowserSupabaseClient: () => ({ auth: { signInWithPassword: passwordMock } }),
}));

afterEach(() => {
  cleanup();
  pushMock.mockReset();
  refreshMock.mockReset();
  passwordMock.mockReset();
  delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  document.head.querySelectorAll('script[src*="turnstile"]').forEach((node) => node.remove());
  delete window.turnstile;
});

describe('Formulir masuk kata sandi', () => {
  it('menampilkan tautan lupa kata sandi', () => {
    render(<SignInForm />);
    expect(screen.getByRole('link', { name: 'Lupa kata sandi?' })).toBeDefined();
  });

  it('menolak submit saat email atau sandi kosong', async () => {
    render(<SignInForm />);
    fireEvent.submit(screen.getByLabelText('Alamat email').closest('form') as HTMLFormElement);
    expect(await screen.findByText('Harap isi alamat email dan kata sandi Anda.')).toBeDefined();
    expect(passwordMock).not.toHaveBeenCalled();
  });

  it('menampilkan galat kredensial yang ramah', async () => {
    passwordMock.mockResolvedValueOnce({ error: new Error('Invalid login') });
    render(<SignInForm />);
    fireEvent.change(screen.getByLabelText('Alamat email'), { target: { value: 'nama@wartanusantara.net' } });
    fireEvent.change(screen.getByLabelText('Kata sandi'), { target: { value: 'rahasia123' } });
    fireEvent.submit(screen.getByLabelText('Alamat email').closest('form') as HTMLFormElement);
    expect(await screen.findByText('Kredensial tidak valid atau akun belum diverifikasi.')).toBeDefined();
  });

  it('mengalihkan ke dashboard saat masuk berhasil', async () => {
    passwordMock.mockResolvedValueOnce({ error: null });
    render(<SignInForm />);
    fireEvent.change(screen.getByLabelText('Alamat email'), { target: { value: 'nama@wartanusantara.net' } });
    fireEvent.change(screen.getByLabelText('Kata sandi'), { target: { value: 'rahasia123' } });
    fireEvent.submit(screen.getByLabelText('Alamat email').closest('form') as HTMLFormElement);
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/dashboard'));
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it('mengaktifkan kembali tombol saat navigasi dashboard memantul balik', async () => {
    passwordMock.mockResolvedValueOnce({ error: null });
    render(<SignInForm />);
    fireEvent.change(screen.getByLabelText('Alamat email'), { target: { value: 'nama@wartanusantara.net' } });
    fireEvent.change(screen.getByLabelText('Kata sandi'), { target: { value: 'rahasia123' } });
    fireEvent.submit(screen.getByLabelText('Alamat email').closest('form') as HTMLFormElement);
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/dashboard'));
    await waitFor(() =>
      expect(
        (screen.getByRole('button', { name: /masuk ke dashboard/i }) as HTMLButtonElement).hasAttribute('disabled'),
      ).toBe(false),
    );
  });

  it('menahan request sampai turnstile terverifikasi setelah form terisi', async () => {
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = 'kunci-uji';
    render(<SignInForm />);
    const submit = screen.getByRole('button', { name: /masuk ke dashboard/i });
    expect(submit.hasAttribute('disabled')).toBe(false);
    fireEvent.change(screen.getByLabelText('Alamat email'), { target: { value: 'nama@wartanusantara.net' } });
    fireEvent.change(screen.getByLabelText('Kata sandi'), { target: { value: 'rahasia123' } });
    await waitFor(() => expect(submit.hasAttribute('disabled')).toBe(true));
    fireEvent.submit(screen.getByLabelText('Alamat email').closest('form') as HTMLFormElement);
    expect(await screen.findByText('Selesaikan verifikasi keamanan terlebih dahulu.')).toBeDefined();
    expect(passwordMock).not.toHaveBeenCalled();
  });

  it('tidak memuat skrip challenge sebelum form terisi lengkap', () => {
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = 'kunci-uji';
    render(<SignInForm />);
    fireEvent.change(screen.getByLabelText('Alamat email'), { target: { value: 'nama@wartanusantara.net' } });
    expect(document.head.querySelector('script[src*="turnstile"]')).toBe(null);
  });
});
