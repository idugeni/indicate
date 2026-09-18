// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

afterEach(() => {
  cleanup();
});

describe('Perintah palet', () => {
  it('merender masukan dan butir perintah', () => {
    render(
      <Command>
        <CommandInput placeholder="Ketik perintah" />
        <CommandList>
          <CommandEmpty>Tak ada hasil</CommandEmpty>
          <CommandItem>Simpan arsip</CommandItem>
        </CommandList>
      </Command>,
    );
    expect(screen.getByPlaceholderText('Ketik perintah')).toBeDefined();
    expect(screen.getByText('Simpan arsip')).toBeDefined();
  });

  it('merender wadah daftar', () => {
    const { container } = render(
      <Command>
        <CommandInput placeholder="Ketik perintah" />
        <CommandList>
          <CommandEmpty>Tak ada hasil</CommandEmpty>
          <CommandItem>Simpan arsip</CommandItem>
        </CommandList>
      </Command>,
    );
    expect(container.querySelector('[data-slot="command"]')).not.toBe(null);
  });
});
