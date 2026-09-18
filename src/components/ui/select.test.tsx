// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { Select, SelectTrigger, SelectValue } from '@/components/ui/select';

afterEach(() => {
  cleanup();
});

describe('Pilihan turun', () => {
  it('merender pemicu kotak kombo', () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Pilih opsi" />
        </SelectTrigger>
      </Select>,
    );
    expect(screen.getByRole('combobox')).toBeDefined();
  });

  it('menampilkan teks petunjuk', () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Pilih opsi" />
        </SelectTrigger>
      </Select>,
    );
    expect(screen.getByText('Pilih opsi')).toBeDefined();
  });
});
