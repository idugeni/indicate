// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';

import { StatusLiveIndicator } from '@/app/status/live-indicator';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('StatusLiveIndicator', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('memperbarui waktu dari API tanpa router.refresh', async () => {
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ generatedAt: '2026-10-01T00:15:00.000Z' }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    render(<StatusLiveIndicator generatedAt="2026-10-01T00:00:00.000Z" />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15 * 60 * 1000);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/status', { cache: 'no-store' });
    expect(screen.getByText('STATUS SNAPSHOT')).toBeDefined();
  });

  it('tidak polling saat tab disembunyikan', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    render(<StatusLiveIndicator generatedAt="2026-10-01T00:00:00.000Z" />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15 * 60 * 1000);
    });
    expect(fetchMock).not.toHaveBeenCalled();
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
  });

  it('menandai basi saat snapshot gagal diambil', async () => {
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('putus');
      }),
    );
    render(<StatusLiveIndicator generatedAt="2026-10-01T00:00:00.000Z" />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15 * 60 * 1000);
    });
    await vi.waitFor(() => expect(screen.getByText('DATA TIDAK TERBARUI — MENCOBA LAGI')).toBeDefined());
  });
});
