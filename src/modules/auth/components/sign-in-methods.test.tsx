// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { SignInMethods } from '@/modules/auth/components/sign-in-methods';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: string }) => <a href={href}>{children}</a>,
}));

vi.mock('@/integrations/supabase/supabase-browser', () => ({
  createBrowserSupabaseClient: () => ({
    auth: {
      signInWithOtp: vi.fn(async () => ({ error: null })),
      verifyOtp: vi.fn(async () => ({ error: null })),
      signInWithPassword: vi.fn(async () => ({ error: null })),
      signInWithOAuth: vi.fn(async () => ({ error: null })),
    },
  }),
}));

afterEach(() => {
  cleanup();
});

describe('Pengalih metode masuk', () => {
  it('menampilkan kode OTP dan tombol Google secara bawaan', () => {
    render(<SignInMethods />);
    expect(screen.getByRole('button', { name: /kirim kode masuk/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /lanjutkan dengan google/i })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Masuk dengan kata sandi' })).toBeDefined();
  });

  it('beralih ke formulir kata sandi lalu kembali ke kode', () => {
    render(<SignInMethods />);
    fireEvent.click(screen.getByRole('button', { name: 'Masuk dengan kata sandi' }));
    expect(screen.getByRole('button', { name: /masuk ke dashboard/i })).toBeDefined();
    expect(screen.queryByRole('button', { name: /kirim kode masuk/i })).toBe(null);
    fireEvent.click(screen.getByRole('button', { name: 'Masuk dengan kode email' }));
    expect(screen.getByRole('button', { name: /kirim kode masuk/i })).toBeDefined();
  });
});
