// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { Drawer, DrawerTrigger } from '@/components/ui/drawer';

afterEach(() => {
  cleanup();
});

describe('Laci pemicu', () => {
  it('merender tombol pemicu', () => {
    render(
      <Drawer>
        <DrawerTrigger>Buka laci</DrawerTrigger>
      </Drawer>,
    );
    expect(screen.getByRole('button', { name: 'Buka laci' })).toBeDefined();
  });

  it('tidak merender dialog saat tertutup', () => {
    render(
      <Drawer>
        <DrawerTrigger>Buka laci</DrawerTrigger>
      </Drawer>,
    );
    expect(screen.queryByRole('dialog')).toBe(null);
  });
});
