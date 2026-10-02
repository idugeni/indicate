// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';

import { clearAvatarCache, DashboardAvatar } from '@/modules/dashboard/components/dashboard-avatar';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  clearAvatarCache();
});

function fallback(container: HTMLElement): string {
  return container.querySelector('[data-slot="avatar-fallback"]')?.textContent ?? '';
}

describe('Avatar pemilik workspace', () => {
  it('menggunakan inisial dua huruf sebagai cadangan', () => {
    const { container } = render(<DashboardAvatar displayName="Redaktur Utama" />);
    expect(fallback(container)).toBe('RE');
  });

  it('tidak melakukan permintaan jaringan untuk referensi https publik', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { container } = render(<DashboardAvatar displayName="Redaktur Utama" avatarRef="https://cdn.contoh.id/foto.png" />);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(fallback(container)).toBe('RE');
  });

  it('meminta endpoint avatar sekali untuk referensi privat r2', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ url: 'https://r2.contoh.id/temporary.png' }) }));
    vi.stubGlobal('fetch', fetchMock);
    render(<DashboardAvatar displayName="Redaktur Utama" avatarRef="r2:org-1/avatar.png" />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith('/api/dashboard/avatar?ref=r2%3Aorg-1%2Favatar.png');
  });

  it('berbagi satu permintaan untuk mount ganda referensi sama', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ url: 'https://r2.contoh.id/temporary.png' }) }));
    vi.stubGlobal('fetch', fetchMock);
    render(
      <>
        <DashboardAvatar displayName="Redaktur Utama" avatarRef="r2:org-1/avatar.png" />
        <DashboardAvatar displayName="Redaktur Utama" avatarRef="r2:org-1/avatar.png" />
      </>,
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  });

  it('tetap pada inisial saat endpoint menolak atau tidak mengembalikan url', async () => {
    const fetchMock = vi.fn(async () => ({ ok: false, json: async () => ({}) }));
    vi.stubGlobal('fetch', fetchMock);
    const { container } = render(<DashboardAvatar displayName="Redaktur Utama" avatarRef="r2:org-1/avatar.png" />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fallback(container)).toBe('RE');
  });

  it('tetap pada inisial saat url yang dikembalikan bukan teks', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ url: 42 }) }));
    vi.stubGlobal('fetch', fetchMock);
    const { container } = render(<DashboardAvatar displayName="Redaktur Utama" avatarRef="r2:org-1/avatar.png" />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fallback(container)).toBe('RE');
  });

  it('menelan kegagalan jaringan tanpa melempar ke halaman', async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error('jaringan mati');
    });
    vi.stubGlobal('fetch', fetchMock);
    const { container } = render(<DashboardAvatar displayName="Redaktur Utama" avatarRef="r2:org-1/avatar.png" />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fallback(container)).toBe('RE');
  });

  it('menolak skema yang bukan https maupun r2 tanpa permintaan', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { container } = render(<DashboardAvatar displayName="Redaktur Utama" avatarRef="javascript:alert(1)" />);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(fallback(container)).toBe('RE');
  });

  it('menampilkan inisial nama satu huruf tanpa permintaan', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { container } = render(<DashboardAvatar displayName="R" avatarRef={null} />);
    expect(fallback(container)).toBe('R');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
