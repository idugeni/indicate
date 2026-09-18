// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { HoverCard, HoverCardTrigger } from '@/components/ui/hover-card';

afterEach(() => {
  cleanup();
});

describe('Kartu layang pemicu', () => {
  it('merender pemicu', () => {
    render(
      <HoverCard>
        <HoverCardTrigger>Layang saya</HoverCardTrigger>
      </HoverCard>,
    );
    expect(screen.getByText('Layang saya')).toBeDefined();
  });

  it('tidak merender konten saat tertutup', () => {
    const { container } = render(
      <HoverCard>
        <HoverCardTrigger>Layang saya</HoverCardTrigger>
      </HoverCard>,
    );
    expect(container.querySelector('[data-slot="hover-card-content"]')).toBe(null);
  });
});
