// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';

afterEach(() => {
  cleanup();
});

describe('Avatar cadangan', () => {
  it('merender teks cadangan', () => {
    render(
      <Avatar>
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>,
    );
    expect(screen.getByText('AB')).toBeDefined();
  });

  it('merender slot avatar', () => {
    const { container } = render(
      <Avatar>
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>,
    );
    expect(container.querySelector('[data-slot="avatar"]')).not.toBe(null);
  });
});
