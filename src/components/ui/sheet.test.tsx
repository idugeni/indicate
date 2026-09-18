// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { Sheet, SheetTrigger } from '@/components/ui/sheet';

afterEach(() => {
  cleanup();
});

describe('Lembar pemicu', () => {
  it('merender tombol pemicu', () => {
    render(
      <Sheet>
        <SheetTrigger>Buka lembar</SheetTrigger>
      </Sheet>,
    );
    expect(screen.getByRole('button', { name: 'Buka lembar' })).toBeDefined();
  });

  it('tidak merender dialog saat tertutup', () => {
    render(
      <Sheet>
        <SheetTrigger>Buka lembar</SheetTrigger>
      </Sheet>,
    );
    expect(screen.queryByRole('dialog')).toBe(null);
  });
});
