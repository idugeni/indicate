// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';

import { StatusLiveIndicator } from '@/app/status/live-indicator';

const refresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  refresh.mockClear();
});

describe('StatusLiveIndicator', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('me-refresh route saat snapshot sehat', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200 })));
    render(<StatusLiveIndicator generatedAt="2026-10-01T00:00:00.000Z" />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15 * 60 * 1000);
    });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(screen.getByText('LIVE 15M CYCLE')).toBeDefined();
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
    expect(refresh).not.toHaveBeenCalled();
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
    expect(refresh).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(screen.getByText('DATA BASI — MENCOBA LAGI')).toBeDefined());
  });
});
