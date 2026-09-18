// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { ContextMenu, ContextMenuTrigger } from '@/components/ui/context-menu';

afterEach(() => {
  cleanup();
});

describe('Menu konteks pemicu', () => {
  it('merender area pemicu', () => {
    render(
      <ContextMenu>
        <ContextMenuTrigger>Klik kanan saya</ContextMenuTrigger>
      </ContextMenu>,
    );
    expect(screen.getByText('Klik kanan saya')).toBeDefined();
  });

  it('tidak merender menu saat tertutup', () => {
    render(
      <ContextMenu>
        <ContextMenuTrigger>Klik kanan saya</ContextMenuTrigger>
      </ContextMenu>,
    );
    expect(screen.queryByRole('menu')).toBe(null);
  });
});
