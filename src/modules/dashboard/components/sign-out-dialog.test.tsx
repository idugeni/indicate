// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { SignOutDialog } from '@/modules/dashboard/components/sign-out-dialog';

afterEach(() => {
  cleanup();
});

describe('Dialog keluar', () => {
  it('membuka konfirmasi dari mode tombol', async () => {
    render(<SignOutDialog mode="button" />);
    fireEvent.click(screen.getByRole('button', { name: 'Keluar' }));
    expect(await screen.findByText('Keluar dari workspace?')).toBeDefined();
    expect(screen.getByText('Sesi Anda di perangkat ini akan diakhiri. Masuk kembali untuk melanjutkan.')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Batal' })).toBeDefined();
  });

  it('membuka konfirmasi dari mode ikon', async () => {
    render(<SignOutDialog mode="icon" />);
    fireEvent.click(screen.getByRole('button', { name: 'Keluar dari workspace' }));
    expect(await screen.findByText('Keluar dari workspace?')).toBeDefined();
  });

  it('mengirim POST keluar lewat aksi destruktif', async () => {
    const { container } = render(<SignOutDialog mode="button" />);
    fireEvent.click(screen.getByRole('button', { name: 'Keluar' }));
    await screen.findByText('Keluar dari workspace?');
    const formulir = document.querySelector('form[action="/auth/sign-out"]') as HTMLFormElement | null;
    expect(formulir).not.toBe(null);
    expect(formulir?.getAttribute('method')).toBe('post');
    expect(screen.getByRole('button', { name: 'Ya, keluar' })).toBeDefined();
    expect(container).toBeDefined();
  });
});
