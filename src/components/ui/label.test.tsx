// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { Label } from '@/components/ui/label';

afterEach(() => {
  cleanup();
});

describe('Label', () => {
  it('merender teks label', () => {
    render(<Label htmlFor="nama">Nama lengkap</Label>);
    expect(screen.getByText('Nama lengkap')).toBeDefined();
  });

  it('merender elemen label dengan atribut for', () => {
    const { container } = render(<Label htmlFor="nama">Nama lengkap</Label>);
    expect(container.querySelector('label[for="nama"]')).not.toBe(null);
  });
});
