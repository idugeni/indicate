// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { MediaLibraryV2 } from '@/modules/dashboard/components/publishing/media-library-v2';

vi.mock('sonner', async () => (await import('@/test/stubs/sonner')).sonnerStub());
vi.mock('next/dynamic', () => ({ default: () => null }));

afterEach(() => cleanup());

const DATA = {
  media: [{
    id: 'm-1',
    objectKey: 'o/org/p/site/logo.png',
    purpose: 'site-logo',
    mediaType: 'image/png',
    sizeBytes: 120_000,
    widthPx: 512,
    heightPx: 512,
    altText: 'Logo portal',
    caption: null,
    owner: { kind: 'site' as const, siteId: 's-1' },
    state: 'active',
    createdAt: '2026-10-08T00:00:00.000Z',
  }],
  mediaCounts: [{ kind: 'site' as const, count: 1, bytes: 120_000 }],
  sites: [{ id: 's-1', normalizedHostname: 'portal.example' }],
};

describe('MediaLibraryV2', () => {
  it('menampilkan command center dan inspector dari aset yang dipilih', () => {
    render(<MediaLibraryV2 data={DATA} command={vi.fn()} />);
    expect(screen.getByText('Asset Command Center')).toBeTruthy();
    expect(screen.getByText('Media Library')).toBeTruthy();
    expect(screen.getByText('logo.png')).toBeTruthy();
    expect(screen.getByText('Asset inspector')).toBeTruthy();
    expect(screen.getByText('portal.example')).toBeTruthy();
  });

  it('mengirim filter server menggunakan contract media.list', async () => {
    const user = userEvent.setup();
    const command = vi.fn(async (action: string) => action === 'media.list'
      ? { items: DATA.media, nextCursor: null }
      : undefined);
    render(<MediaLibraryV2 data={DATA} command={command} />);
    await user.type(screen.getByRole('textbox', { name: 'Cari aset' }), 'logo');
    await waitFor(() => expect(command).toHaveBeenCalledWith(
      'media.list',
      expect.objectContaining({ search: 'logo', limit: 24 }),
    ), { timeout: 2000 });
  });

  it('meminta signed authorization melalui media.read saat pratinjau dibuka', async () => {
    const user = userEvent.setup();
    const command = vi.fn(async (action: string) => action === 'media.read'
      ? { url: 'https://r2.example/logo.png', requiredHeaders: { 'x-test': 'sig' } }
      : undefined);
    render(<MediaLibraryV2 data={DATA} command={command} />);
    await user.click(screen.getByRole('button', { name: 'Buka pratinjau aman' }));
    await waitFor(() => expect(command).toHaveBeenCalledWith('media.read', { mediaId: 'm-1' }));
  });

  it('memuat cursor berikutnya tanpa request N+1 per aset', async () => {
    const user = userEvent.setup();
    const command = vi.fn(async (action: string) => action === 'media.list'
      ? { items: [{ ...DATA.media[0], id: 'm-2', objectKey: 'o/org/p/site/logo-2.png' }], nextCursor: null }
      : undefined);
    render(<MediaLibraryV2 data={{ ...DATA, nextCursor: 'cursor-1' }} command={command} />);
    await user.click(screen.getByRole('button', { name: 'Muat halaman berikutnya' }));
    await waitFor(() => expect(command).toHaveBeenCalledWith(
      'media.list',
      expect.objectContaining({ cursor: 'cursor-1', limit: 24 }),
    ));
    expect(command).toHaveBeenCalledTimes(1);
  });
});
