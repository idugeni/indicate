// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { GoogleButton } from '@/modules/auth/components/google-button';

const oauthMock = vi.hoisted(() => vi.fn());

vi.mock('@/integrations/supabase/supabase-browser', () => ({
  createBrowserSupabaseClient: () => ({ auth: { signInWithOAuth: oauthMock } }),
}));

afterEach(() => {
  cleanup();
  oauthMock.mockReset();
});

describe('Tombol Google', () => {
  it('merender label awal', () => {
    render(<GoogleButton />);
    expect(screen.getByRole('button', { name: /lanjutkan dengan google/i })).toBeDefined();
  });

  it('merender markah-G empat warna resmi Google', () => {
    const { container } = render(<GoogleButton />);
    const paths = container.querySelectorAll('svg path');
    const fills = new Set(Array.from(paths).map((path) => path.getAttribute('fill')));
    for (const brand of ['#4285F4', '#34A853', '#FBBC05', '#EA4335']) {
      expect(fills.has(brand)).toBe(true);
    }
  });

  it('menampilkan status sibuk saat proses oauth berjalan', async () => {
    oauthMock.mockImplementationOnce(() => new Promise(() => {}));
    render(<GoogleButton />);
    fireEvent.click(screen.getByRole('button', { name: /lanjutkan dengan google/i }));
    expect(await screen.findByRole('button', { name: /membuka google/i })).toBeDefined();
    expect(oauthMock).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'google' }),
    );
  });

  it('kembali idle saat oauth mengembalikan galat', async () => {
    oauthMock.mockResolvedValueOnce({ error: new Error('gagal') });
    render(<GoogleButton />);
    fireEvent.click(screen.getByRole('button', { name: /lanjutkan dengan google/i }));
    expect(await screen.findByRole('button', { name: /lanjutkan dengan google/i })).toBeDefined();
  });
});
