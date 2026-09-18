// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { Calendar } from '@/components/ui/calendar';

afterEach(() => {
  cleanup();
});

describe('Kalender', () => {
  it('merender akar day picker', () => {
    const { container } = render(<Calendar />);
    expect(container.querySelector('.rdp-root')).not.toBe(null);
  });

  it('merender tombol navigasi bulan', () => {
    render(<Calendar />);
    expect(screen.getAllByRole('button').length).toBeGreaterThanOrEqual(2);
  });
});
