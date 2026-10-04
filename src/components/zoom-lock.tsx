'use client';

import { useEffect } from 'react';

const ZOOM_KEYS = new Set(['+', '-', '=', '0']);

/**
 * Enforce the site-wide zoom lock where meta and CSS cannot reach.
 *
 * @remarks Viewport `user-scalable=no` is ignored by some mobile browsers
 * and `touch-action` does not cover trackpad-pinch or keyboard zoom, so this
 * island blocks those three paths with non-passive listeners. Renders nothing.
 * @returns Null element owning the guard lifecycle.
 */
export function ZoomLock() {
  useEffect(() => {
    const deny = (event: Event) => {
      event.preventDefault();
    };
    const denyCtrlWheel = (event: WheelEvent) => {
      if (event.ctrlKey) event.preventDefault();
    };
    const denyZoomKeys = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && ZOOM_KEYS.has(event.key)) event.preventDefault();
    };
    document.addEventListener('gesturestart', deny);
    document.addEventListener('gesturechange', deny);
    document.addEventListener('wheel', denyCtrlWheel, { passive: false });
    document.addEventListener('keydown', denyZoomKeys);
    return () => {
      document.removeEventListener('gesturestart', deny);
      document.removeEventListener('gesturechange', deny);
      document.removeEventListener('wheel', denyCtrlWheel);
      document.removeEventListener('keydown', denyZoomKeys);
    };
  }, []);
  return null;
}
