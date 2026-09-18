// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

afterEach(() => {
  cleanup();
});

describe('Grup radio', () => {
  it('merender dua pilihan radio', () => {
    render(
      <RadioGroup aria-label="Pilih warna">
        <RadioGroupItem value="merah" aria-label="Merah" />
        <RadioGroupItem value="biru" aria-label="Biru" />
      </RadioGroup>,
    );
    expect(screen.getByRole('radiogroup', { name: 'Pilih warna' })).toBeDefined();
    expect(screen.getByRole('radio', { name: 'Merah' })).toBeDefined();
    expect(screen.getByRole('radio', { name: 'Biru' })).toBeDefined();
  });

  it('merender slot grup radio', () => {
    const { container } = render(
      <RadioGroup aria-label="Pilih warna">
        <RadioGroupItem value="merah" aria-label="Merah" />
      </RadioGroup>,
    );
    expect(container.querySelector('[data-slot="radio-group"]')).not.toBe(null);
  });
});
