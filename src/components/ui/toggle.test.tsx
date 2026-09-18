// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { Toggle } from '@/components/ui/toggle';

afterEach(() => {
  cleanup();
});

describe('Jungkit', () => {
  it('merender tombol jungkit', () => {
    render(<Toggle aria-label="Tebal">Tebal</Toggle>);
    expect(screen.getByRole('button', { name: 'Tebal' })).toBeDefined();
  });

  it('beralih tekan saat diklik', () => {
    render(<Toggle aria-label="Tebal">Tebal</Toggle>);
    const tombol = screen.getByRole('button', { name: 'Tebal' });
    fireEvent.click(tombol);
    expect(tombol.getAttribute('aria-pressed')).toBe('true');
  });
});
