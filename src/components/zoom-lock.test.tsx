// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';

import { ZoomLock } from '@/components/zoom-lock';

afterEach(() => cleanup());

describe('ZoomLock', () => {
  it('menggagalkan cubitan iOS, ctrl+roda, dan tombol zoom papan ketik', () => {
    render(<ZoomLock />);
    const gesture = new Event('gesturestart', { cancelable: true });
    document.dispatchEvent(gesture);
    expect(gesture.defaultPrevented).toBe(true);
    const plainWheel = new WheelEvent('wheel', { cancelable: true });
    document.dispatchEvent(plainWheel);
    expect(plainWheel.defaultPrevented).toBe(false);
    const ctrlWheel = new WheelEvent('wheel', { cancelable: true, ctrlKey: true });
    document.dispatchEvent(ctrlWheel);
    expect(ctrlWheel.defaultPrevented).toBe(true);
    const zoomKey = new KeyboardEvent('keydown', { cancelable: true, ctrlKey: true, key: '=' });
    document.dispatchEvent(zoomKey);
    expect(zoomKey.defaultPrevented).toBe(true);
  });

  it('melepas seluruh penjaga saat dilepas', () => {
    const { unmount } = render(<ZoomLock />);
    unmount();
    const gesture = new Event('gesturestart', { cancelable: true });
    document.dispatchEvent(gesture);
    expect(gesture.defaultPrevented).toBe(false);
  });
});
