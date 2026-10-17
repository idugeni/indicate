// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { SignInMethods } from '@/modules/auth/components/sign-in-methods';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock('next/link', () => ({ default: ({ href, children }: { href: string; children: string }) => <a href={href}>{children}</a> }));

afterEach(() => { cleanup(); });

describe('Metode masuk', () => {
  it('hanya menampilkan email/kata sandi dan pemulihan akun', () => {
    render(<SignInMethods />);
    expect(screen.getByLabelText('Alamat email')).toBeDefined();
    expect(screen.getByLabelText('Kata sandi')).toBeDefined();
    expect(screen.getByRole('link', { name: 'Lupa kata sandi?' })).toBeDefined();
    expect(screen.getByRole('button', { name: /masuk ke dashboard/i })).toBeDefined();
    expect(screen.queryByRole('button', { name: /lanjutkan dengan google/i })).toBe(null);
    expect(screen.queryByRole('button', { name: /kirim kode masuk/i })).toBe(null);
    expect(screen.queryByLabelText('Kode masuk')).toBe(null);
  });
});
