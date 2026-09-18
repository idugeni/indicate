// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { scrollToTop } from '@/ui/scroll';

type FrameCallback = (now: number) => void;

let frames: FrameCallback[];
let scrollTo: ReturnType<typeof vi.fn>;

function jalankanFrame(now: number): void {
  const antre = [...frames];
  frames = [];
  for (const frame of antre) frame(now);
}

beforeEach(() => {
  frames = [];
  scrollTo = vi.fn();
  vi.useFakeTimers();
  Object.defineProperty(window, 'scrollTo', { value: scrollTo, configurable: true, writable: true });
  Object.defineProperty(window, 'requestAnimationFrame', {
    value: vi.fn((callback: FrameCallback) => {
      frames.push(callback);
      return frames.length;
    }),
    configurable: true,
    writable: true,
  });
  vi.spyOn(performance, 'now').mockReturnValue(0);
  document.documentElement.style.scrollBehavior = '';
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('scrollToTop', () => {
  it('tidak melakukan apa-apa saat sudah di paling atas', () => {
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
    scrollToTop();
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('menganimasikan gulir ke atas lalu memulihkan perilaku scroll', () => {
    Object.defineProperty(window, 'scrollY', { value: 600, configurable: true });
    document.documentElement.style.scrollBehavior = 'smooth';
    scrollToTop();
    expect(document.documentElement.style.scrollBehavior).toBe('auto');
    jalankanFrame(0);
    expect(scrollTo).toHaveBeenLastCalledWith(0, 600);
    jalankanFrame(325);
    expect(scrollTo).toHaveBeenLastCalledWith(0, 300);
    jalankanFrame(650);
    expect(scrollTo).toHaveBeenLastCalledWith(0, 0);
    expect(document.documentElement.style.scrollBehavior).toBe('smooth');
  });

  it('membatalkan animasi saat ada input wheel', () => {
    Object.defineProperty(window, 'scrollY', { value: 600, configurable: true });
    scrollToTop();
    jalankanFrame(0);
    expect(scrollTo).toHaveBeenCalledTimes(1);
    window.dispatchEvent(new window.Event('wheel'));
    jalankanFrame(325);
    expect(scrollTo).toHaveBeenCalledTimes(1);
  });
});
