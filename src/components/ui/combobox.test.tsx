// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { Combobox, ComboboxInput } from '@/components/ui/combobox';

afterEach(() => {
  cleanup();
});

describe('Kotak kombo', () => {
  it('merender masukan dengan petunjuk', () => {
    render(
      <Combobox items={['Apel', 'Jeruk']}>
        <ComboboxInput placeholder="Cari buah" />
      </Combobox>,
    );
    expect(screen.getByPlaceholderText('Cari buah')).toBeDefined();
  });

  it('merender peran kotak kombo', () => {
    render(
      <Combobox items={['Apel', 'Jeruk']}>
        <ComboboxInput placeholder="Cari buah" />
      </Combobox>,
    );
    expect(screen.getByRole('combobox')).toBeDefined();
  });
});
