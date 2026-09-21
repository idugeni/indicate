// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { ProfileForm } from '@/modules/dashboard/components/settings/profile-form';

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: string }) => <a href={href}>{children}</a>,
}));

const PROFILE = {
  displayName: 'Redaktur Uji',
  email: 'redaktur@contoh.id',
  bio: 'Bio awal',
  locale: 'id-ID',
  timezone: 'Asia/Jakarta',
  avatarUrl: null,
  oauthAvatarUrl: null,
};

function stubProfile(overrides: unknown = {}) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === 'POST') return { ok: true, json: async () => ({}) };
      return { ok: true, json: async () => ({ ...PROFILE, ...(overrides as object) }) };
    }),
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Formulir profil', () => {
  it('menampilkan nama, email, dan tautan ganti sandi', async () => {
    stubProfile();
    render(<ProfileForm />);
    expect(await screen.findByText('Redaktur Uji')).toBeDefined();
    expect(screen.getByText('redaktur@contoh.id')).toBeDefined();
    expect(screen.getByLabelText('Bio (maks 500 karakter)')).toBeDefined();
    expect(screen.getByRole('link', { name: 'Ganti Kata Sandi' })).toBeDefined();
  });

  it('menyimpan bio lewat API dan menampilkan pemberitahuan', async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === 'POST') return { ok: true, json: async () => ({}) };
      return { ok: true, json: async () => PROFILE };
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<ProfileForm />);
    await screen.findByText('Redaktur Uji');
    fireEvent.change(screen.getByLabelText('Bio (maks 500 karakter)'), { target: { value: 'Bio baru redaksi' } });
    fireEvent.submit(screen.getByLabelText('Bio (maks 500 karakter)').closest('form') as HTMLFormElement);
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/dashboard/profile',
        expect.objectContaining({ method: 'POST' }),
      ),
    );
    expect(await screen.findByText('Profil tersimpan.')).toBeDefined();
  });

  it('menampilkan pemilih berkas saat mode unggah dipilih', async () => {
    stubProfile();
    const { container } = render(<ProfileForm />);
    await screen.findByText('Redaktur Uji');
    fireEvent.click(screen.getByRole('radio', { name: 'Unggah baru' }));
    expect(container.querySelector('input[type="file"]')).not.toBe(null);
  });

  it('menampilkan galat saat profil gagal dimuat', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('jaringan putus');
      }),
    );
    render(<ProfileForm />);
    expect(await screen.findByText('Gagal memuat profil.')).toBeDefined();
  });
});
