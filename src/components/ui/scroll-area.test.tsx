// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { ScrollArea } from '@/components/ui/scroll-area';

afterEach(() => {
  cleanup();
});

describe('Area gulir', () => {
  it('merender anak di dalamnya', () => {
    render(
      <ScrollArea>
        <div>Konten gulir</div>
      </ScrollArea>,
    );
    expect(screen.getByText('Konten gulir')).toBeDefined();
  });

  it('merender slot area gulir', () => {
    const { container } = render(
      <ScrollArea>
        <div>Konten gulir</div>
      </ScrollArea>,
    );
    expect(container.querySelector('[data-slot="scroll-area"]')).not.toBe(null);
  });
});
