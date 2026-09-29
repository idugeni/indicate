// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';

import { useDashboardPage } from '@/modules/dashboard/components/shared/use-dashboard-query';

vi.mock('nuqs', async () => (await import('@/test/stubs/nuqs')).nuqsStub());

afterEach(() => {
  cleanup();
});

describe('useDashboardPage', () => {
  it('memulai dari halaman satu', () => {
    const { result } = renderHook(() => useDashboardPage());
    expect(result.current[0]).toBe(1);
  });

  it('menyimpan halaman baru di state, bukan memuat ulang komponen', () => {
    const { result } = renderHook(() => useDashboardPage());
    act(() => result.current[1](3));
    expect(result.current[0]).toBe(3);
  });

  it('memisahkan halaman antar daftar pada tampilan dengan dua pager', () => {
    const categories = renderHook(() => useDashboardPage('categoryPage'));
    const tags = renderHook(() => useDashboardPage('tagPage'));
    act(() => categories.result.current[1](2));
    expect(categories.result.current[0]).toBe(2);
    expect(tags.result.current[0]).toBe(1);
  });

  it('kembali ke halaman satu saat diminta nilai di bawah satu', () => {
    const { result } = renderHook(() => useDashboardPage());
    act(() => result.current[1](4));
    act(() => result.current[1](0));
    expect(result.current[0]).toBe(1);
  });
});
