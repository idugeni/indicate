// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { Separator } from '@/components/ui/separator';

afterEach(() => {
  cleanup();
});

describe('Pemisah', () => {
  it('merender peran pemisah', () => {
    render(<Separator />);
    expect(screen.getByRole('separator')).toBeDefined();
  });

  it('merender slot pemisah', () => {
    const { container } = render(<Separator />);
    expect(container.querySelector('[data-slot="separator"]')).not.toBe(null);
  });
});
