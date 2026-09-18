// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { Dialog, DialogTrigger } from '@/components/ui/dialog';

afterEach(() => {
  cleanup();
});

describe('Dialog pemicu', () => {
  it('merender tombol pemicu', () => {
    render(
      <Dialog>
        <DialogTrigger>Buka dialog</DialogTrigger>
      </Dialog>,
    );
    expect(screen.getByRole('button', { name: 'Buka dialog' })).toBeDefined();
  });

  it('tidak merender dialog saat tertutup', () => {
    render(
      <Dialog>
        <DialogTrigger>Buka dialog</DialogTrigger>
      </Dialog>,
    );
    expect(screen.queryByRole('dialog')).toBe(null);
  });
});
