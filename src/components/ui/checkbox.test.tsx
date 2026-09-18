// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { Checkbox } from '@/components/ui/checkbox';

afterEach(() => {
  cleanup();
});

describe('Kotak centang', () => {
  it('merender kotak centang berlabel', () => {
    render(<Checkbox aria-label="Setuju" />);
    expect(screen.getByRole('checkbox', { name: 'Setuju' })).toBeDefined();
  });

  it('beralih centang saat diklik', () => {
    render(<Checkbox aria-label="Setuju" />);
    const kotak = screen.getByRole('checkbox', { name: 'Setuju' });
    fireEvent.click(kotak);
    expect(kotak.getAttribute('aria-checked')).toBe('true');
  });
});
