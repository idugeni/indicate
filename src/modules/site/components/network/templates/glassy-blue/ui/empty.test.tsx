// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { GlassyBlueEmpty } from '@/modules/site/components/network/templates/glassy-blue/ui/empty';

afterEach(() => {
  cleanup();
});

describe('GlassyBlueEmpty', () => {
  it('menyebut konteks kanal dalam status kosong', () => {
    render(<GlassyBlueEmpty title="Kanal Teknologi" />);
    expect(screen.getByRole('status')).toBeDefined();
    expect(screen.getByText('Belum ada laporan terbit')).toBeDefined();
    expect(screen.getByText(/Kanal Teknologi/)).toBeDefined();
  });
});
