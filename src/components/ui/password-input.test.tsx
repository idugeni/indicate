// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { PasswordInput } from '@/components/ui/password-input';

afterEach(() => {
  cleanup();
});

describe('PasswordInput', () => {
  it('menyembunyikan kata sandi secara bawaan', () => {
    render(<PasswordInput id="sandi" aria-label="Kata sandi" />);
    expect(screen.getByLabelText('Kata sandi')).toHaveProperty('type', 'password');
    expect(screen.getByRole('button', { name: 'Tampilkan kata sandi' })).toBeDefined();
  });

  it('menampilkan dan menyembunyikan ulang saat ikon mata diklik', () => {
    render(<PasswordInput id="sandi" aria-label="Kata sandi" />);
    fireEvent.click(screen.getByRole('button', { name: 'Tampilkan kata sandi' }));
    expect(screen.getByLabelText('Kata sandi')).toHaveProperty('type', 'text');
    expect(screen.getByRole('button', { name: 'Sembunyikan kata sandi' })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Sembunyikan kata sandi' }));
    expect(screen.getByLabelText('Kata sandi')).toHaveProperty('type', 'password');
  });
});
