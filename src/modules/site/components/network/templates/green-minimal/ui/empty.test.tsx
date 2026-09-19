// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { GreenMinimalEmpty } from '@/modules/site/components/network/templates/green-minimal/ui/empty';

afterEach(() => {
  cleanup();
});

describe('GreenMinimalEmpty', () => {
  it('menyebut konteks kanal dalam status kosong', () => {
    render(<GreenMinimalEmpty title="Kanal Teknologi" />);
    expect(screen.getByRole('status')).toBeDefined();
    expect(screen.getByText('Belum ada laporan terbit')).toBeDefined();
    expect(screen.getByText(/Kanal Teknologi/)).toBeDefined();
  });
});
