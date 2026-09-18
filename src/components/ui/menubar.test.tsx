// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { Menubar, MenubarMenu, MenubarTrigger } from '@/components/ui/menubar';

afterEach(() => {
  cleanup();
});

describe('Bilah menu', () => {
  it('merender pemicu menu', () => {
    render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>Berkas</MenubarTrigger>
        </MenubarMenu>
      </Menubar>,
    );
    expect(screen.getByRole('menuitem', { name: 'Berkas' })).toBeDefined();
  });

  it('tidak merender menu saat tertutup', () => {
    render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>Berkas</MenubarTrigger>
        </MenubarMenu>
      </Menubar>,
    );
    expect(screen.queryByRole('menu')).toBe(null);
  });
});
