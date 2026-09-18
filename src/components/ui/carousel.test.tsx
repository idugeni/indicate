// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';

vi.stubGlobal('matchMedia', () => ({
  matches: false,
  addListener() {},
  removeListener() {},
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() {
    return false;
  },
}));

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

vi.stubGlobal(
  'IntersectionObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

afterEach(() => {
  cleanup();
});

describe('Korsel', () => {
  it('merender semua item', () => {
    render(
      <Carousel>
        <CarouselContent>
          <CarouselItem>
            <div>Geser satu</div>
          </CarouselItem>
          <CarouselItem>
            <div>Geser dua</div>
          </CarouselItem>
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>,
    );
    expect(screen.getByText('Geser satu')).toBeDefined();
    expect(screen.getByText('Geser dua')).toBeDefined();
  });

  it('merender tombol sebelumnya dan berikut', () => {
    render(
      <Carousel>
        <CarouselContent>
          <CarouselItem>
            <div>Geser satu</div>
          </CarouselItem>
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>,
    );
    expect(screen.getByRole('button', { name: 'Previous slide' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Next slide' })).toBeDefined();
  });
});
