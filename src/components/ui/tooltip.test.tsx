// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

afterEach(() => {
  cleanup();
});

describe('Keterangan alat pemicu', () => {
  it('merender pemicu', () => {
    render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>Info tambahan</TooltipTrigger>
        </Tooltip>
      </TooltipProvider>,
    );
    expect(screen.getByText('Info tambahan')).toBeDefined();
  });

  it('tidak merender konten saat tertutup', () => {
    const { container } = render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>Info tambahan</TooltipTrigger>
        </Tooltip>
      </TooltipProvider>,
    );
    expect(container.querySelector('[data-slot="tooltip-content"]')).toBe(null);
  });
});
