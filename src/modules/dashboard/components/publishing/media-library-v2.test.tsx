// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { MediaLibraryV2 } from './media-library-v2';

vi.mock('next/dynamic', () => ({ default: () => () => null }));
vi.mock('@/modules/ai/components/ai-media-analyze', () => ({
  AiMediaAnalyze: () => null,
}));
vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function asset(id: string, objectKey: string) {
  return {
    id,
    objectKey,
    purpose: 'organization-asset',
    mediaType: 'image/png',
    sizeBytes: 1024,
    widthPx: 512,
    heightPx: 512,
    altText: null,
    caption: null,
    owner: { kind: 'organization' as const },
    state: 'active',
    createdAt: '2026-10-08T00:00:00.000Z',
  };
}

describe('MediaLibraryV2', () => {
  it('replaces the base page with server-filtered results and appends cursor pages', async () => {
    const initial = asset('initial', 'initial.png');
    const filtered = asset('filtered', 'brand-logo.png');
    const next = asset('next', 'brand-logo-dark.png');
    const command = vi.fn(async (_action: string, payload: unknown) => {
      const input = payload as { readonly cursor?: string; readonly search?: string };
      if (input.cursor === 'cursor-2') return { items: [next], nextCursor: null };
      if (input.search === 'logo') return { items: [filtered], nextCursor: 'cursor-2' };
      return { items: [], nextCursor: null };
    });

    render(
      <MediaLibraryV2
        data={{ media: [initial], mediaCounts: [{ kind: 'organization', count: 1, bytes: 1024 }] }}
        command={command}
        organizationId="org-1"
      />,
    );

    expect(screen.getByText('initial.png')).toBeDefined();
    fireEvent.change(screen.getByRole('textbox', { name: 'Cari aset' }), {
      target: { value: 'logo' },
    });

    expect(await screen.findByText('brand-logo.png', {}, { timeout: 2000 })).toBeDefined();
    expect(screen.queryByText('initial.png')).toBeNull();
    expect(command).toHaveBeenCalledWith('media.list', {
      limit: 24,
      search: 'logo',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Muat halaman berikutnya' }));
    expect(await screen.findByText('brand-logo-dark.png')).toBeDefined();
    expect(screen.queryByText('initial.png')).toBeNull();
    expect(command).toHaveBeenCalledWith('media.list', {
      limit: 24,
      cursor: 'cursor-2',
      search: 'logo',
    });
  });

  it('does not let a stale filter response replace the latest query', async () => {
    let resolveFirst: ((value: unknown) => void) | undefined;
    const slow = new Promise<unknown>((resolve) => { resolveFirst = resolve; });
    const newer = asset('newer', 'newer-logo.png');
    const command = vi.fn(async (_action: string, payload: unknown) => {
      const input = payload as { readonly search?: string };
      if (input.search === 'old') return slow;
      if (input.search === 'new') return { items: [newer], nextCursor: null };
      return { items: [], nextCursor: null };
    });

    render(<MediaLibraryV2 data={{ media: [asset('base', 'base.png')] }} command={command} organizationId="org-1" />);
    const search = screen.getByRole('textbox', { name: 'Cari aset' });
    fireEvent.change(search, { target: { value: 'old' } });
    await waitFor(() => expect(command).toHaveBeenCalledWith('media.list', { limit: 24, search: 'old' }), { timeout: 2000 });
    fireEvent.change(search, { target: { value: 'new' } });
    expect(await screen.findByText('newer-logo.png', {}, { timeout: 2000 })).toBeDefined();
    resolveFirst?.({ items: [asset('stale', 'stale-old.png')], nextCursor: null });
    await waitFor(() => expect(screen.queryByText('stale-old.png')).toBeNull());
    expect(screen.queryByText('base.png')).toBeNull();
  });
});
