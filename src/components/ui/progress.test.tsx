// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { Progress } from '@/components/ui/progress';

afterEach(() => {
  cleanup();
});

describe('Bilah kemajuan', () => {
  it('merender peran bilah kemajuan', () => {
    render(<Progress value={50} />);
    expect(screen.getByRole('progressbar')).toBeDefined();
  });

  it('merender slot kemajuan dan lintasan', () => {
    const { container } = render(<Progress value={50} />);
    expect(container.querySelector('[data-slot="progress"]')).not.toBe(null);
    expect(container.querySelector('[data-slot="progress-track"]')).not.toBe(null);
  });
});
