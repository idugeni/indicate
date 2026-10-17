// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { SignInForm } from '@/modules/auth/components/sign-in-form';

const pushMock = vi.hoisted(() => vi.fn());
const refreshMock = vi.hoisted(() => vi.fn());
const passwordMock = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock, refresh: refreshMock }) }));
vi.mock('next/link', () => ({ default: ({ href, children }: { href: string; children: string }) => <a href={href}>{children}</a> }));
vi.mock('@/integrations/neon-auth/client', () => ({
  neonAuthClient: { signIn: { email: passwordMock } },
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

describe('Formulir masuk email/kata sandi Neon Auth', () => {
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

  it('mengalihkan ke dashboard setelah Neon mengautentikasi sesi', async () => {
    passwordMock.mockResolvedValueOnce({ error: null });
    render(<SignInForm />);
    fireEvent.change(screen.getByLabelText('Alamat email'), { target: { value: 'nama@wartanusantara.net' } });
    fireEvent.change(screen.getByLabelText('Kata sandi'), { target: { value: 'rahasia123' } });
    fireEvent.submit(screen.getByLabelText('Alamat email').closest('form') as HTMLFormElement);
    await waitFor(() => expect(passwordMock).toHaveBeenCalledWith(
      { email: 'nama@wartanusantara.net', password: 'rahasia123' },
      undefined,
    ));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/dashboard'));
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it('menahan login sampai challenge Turnstile siap bila challenge dikonfigurasi', async () => {
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = 'kunci-uji';
    render(<SignInForm />);
    const submit = screen.getByRole('button', { name: /masuk ke dashboard/i });
    fireEvent.change(screen.getByLabelText('Alamat email'), { target: { value: 'nama@wartanusantara.net' } });
    fireEvent.change(screen.getByLabelText('Kata sandi'), { target: { value: 'rahasia123' } });
    await waitFor(() => expect(submit.hasAttribute('disabled')).toBe(true));
    fireEvent.submit(screen.getByLabelText('Alamat email').closest('form') as HTMLFormElement);
    expect(await screen.findByText('Selesaikan verifikasi keamanan terlebih dahulu.')).toBeDefined();
    expect(passwordMock).not.toHaveBeenCalled();
  });
});
