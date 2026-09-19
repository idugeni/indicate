// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { RedEditorialEmpty } from '@/modules/site/components/network/templates/red-editorial/ui/empty';

afterEach(() => {
  cleanup();
});

describe('RedEditorialEmpty', () => {
  it('menyebut konteks kanal dalam status kosong', () => {
    render(<RedEditorialEmpty title="Kanal Teknologi" />);
    expect(screen.getByRole('status')).toBeDefined();
    expect(screen.getByText('Belum ada laporan terbit')).toBeDefined();
    expect(screen.getByText(/Kanal Teknologi/)).toBeDefined();
  });
});
