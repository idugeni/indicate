'use client';

import * as React from 'react';

/** WAI-APG roving tabindex for tablist/radiogroup with automatic activation (arrows select, Home/End jump). */
export function useRovingSelection<T extends string>(
  values: readonly T[],
  active: T,
  onSelect: (value: T) => void
) {
  const controls = React.useRef(new Map<T, HTMLButtonElement>());

  const register = React.useCallback(
    (value: T) => (element: HTMLButtonElement | null) => {
      if (element) {
        controls.current.set(value, element);
      } else {
        controls.current.delete(value);
      }
    },
    []
  );

  const tabIndexFor = React.useCallback((value: T) => (value === active ? 0 : -1), [active]);

  const onKeyDown = React.useCallback(
    (event: React.KeyboardEvent) => {
      const current = values.indexOf(active);
      let next: number | null = null;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        next = (current + 1) % values.length;
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        next = (current - 1 + values.length) % values.length;
      } else if (event.key === 'Home') {
        next = 0;
      } else if (event.key === 'End') {
        next = values.length - 1;
      }
      if (next === null) return;
      event.preventDefault();
      const value = values[next];
      if (value === undefined) return;
      onSelect(value);
      controls.current.get(value)?.focus();
    },
    [values, active, onSelect]
  );

  return { register, tabIndexFor, onKeyDown };
}
