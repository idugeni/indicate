// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { CleanBlueEmpty } from '@/modules/site/components/network/templates/clean-blue/ui/empty';

afterEach(() => {
  cleanup();
});

describe('CleanBlueEmpty', () => {
  it('menyebut konteks kanal dalam status kosong', () => {
    render(<CleanBlueEmpty title="Kanal Teknologi" />);
    expect(screen.getByRole('status')).toBeDefined();
    expect(screen.getByText('Belum ada laporan terbit')).toBeDefined();
    expect(screen.getByText(/Kanal Teknologi/)).toBeDefined();
  });
});
