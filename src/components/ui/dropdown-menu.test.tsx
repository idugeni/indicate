// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { DropdownMenu, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

afterEach(() => {
  cleanup();
});

describe('Menu turun pemicu', () => {
  it('merender tombol pemicu', () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Buka menu</DropdownMenuTrigger>
      </DropdownMenu>,
    );
    expect(screen.getByRole('button', { name: 'Buka menu' })).toBeDefined();
  });

  it('tidak merender menu saat tertutup', () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Buka menu</DropdownMenuTrigger>
      </DropdownMenu>,
    );
    expect(screen.queryByRole('menu')).toBe(null);
  });
});
