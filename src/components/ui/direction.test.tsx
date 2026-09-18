// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { DirectionProvider, useDirection } from '@/components/ui/direction';

function PerabaArah() {
  const arah = useDirection();
  return <span>{arah}</span>;
}

afterEach(() => {
  cleanup();
});

describe('Penyedia arah', () => {
  it('merender anak di dalamnya', () => {
    render(
      <DirectionProvider direction="ltr">
        <span>Isi arah</span>
      </DirectionProvider>,
    );
    expect(screen.getByText('Isi arah')).toBeDefined();
  });

  it('meneruskan arah ke kait', () => {
    render(
      <DirectionProvider direction="ltr">
        <PerabaArah />
      </DirectionProvider>,
    );
    expect(screen.getByText('ltr')).toBeDefined();
  });
});
