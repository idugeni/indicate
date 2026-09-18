// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { Popover, PopoverTrigger } from '@/components/ui/popover';

afterEach(() => {
  cleanup();
});

describe('Popover pemicu', () => {
  it('merender tombol pemicu', () => {
    render(
      <Popover>
        <PopoverTrigger>Buka popover</PopoverTrigger>
      </Popover>,
    );
    expect(screen.getByRole('button', { name: 'Buka popover' })).toBeDefined();
  });

  it('tidak merender konten saat tertutup', () => {
    const { container } = render(
      <Popover>
        <PopoverTrigger>Buka popover</PopoverTrigger>
      </Popover>,
    );
    expect(container.querySelector('[data-slot="popover-content"]')).toBe(null);
  });
});
