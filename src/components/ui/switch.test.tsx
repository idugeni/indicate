// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { Switch } from '@/components/ui/switch';

afterEach(() => {
  cleanup();
});

describe('Saklar', () => {
  it('merender saklar berlabel', () => {
    render(<Switch aria-label="Notifikasi" />);
    expect(screen.getByRole('switch', { name: 'Notifikasi' })).toBeDefined();
  });

  it('beralih nyala saat diklik', () => {
    render(<Switch aria-label="Notifikasi" />);
    const saklar = screen.getByRole('switch', { name: 'Notifikasi' });
    fireEvent.click(saklar);
    expect(saklar.getAttribute('aria-checked')).toBe('true');
  });
});
