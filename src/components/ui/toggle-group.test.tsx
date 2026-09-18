// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

afterEach(() => {
  cleanup();
});

describe('Grup jungkit', () => {
  it('merender semua butir', () => {
    render(
      <ToggleGroup>
        <ToggleGroupItem value="kiri" aria-label="Kiri">
          Kiri
        </ToggleGroupItem>
        <ToggleGroupItem value="kanan" aria-label="Kanan">
          Kanan
        </ToggleGroupItem>
      </ToggleGroup>,
    );
    expect(screen.getByRole('button', { name: 'Kiri' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Kanan' })).toBeDefined();
  });

  it('beralih tekan saat butir diklik', () => {
    render(
      <ToggleGroup>
        <ToggleGroupItem value="kiri" aria-label="Kiri">
          Kiri
        </ToggleGroupItem>
      </ToggleGroup>,
    );
    const butir = screen.getByRole('button', { name: 'Kiri' });
    fireEvent.click(butir);
    expect(butir.getAttribute('aria-pressed')).toBe('true');
  });
});
