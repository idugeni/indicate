// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { BlackLimeEmpty } from '@/modules/site/components/network/templates/black-lime/ui/empty';

afterEach(() => {
  cleanup();
});

describe('BlackLimeEmpty', () => {
  it('menyebut konteks kanal dalam status kosong', () => {
    render(<BlackLimeEmpty title="Kanal Teknologi" />);
    expect(screen.getByRole('status')).toBeDefined();
    expect(screen.getByText('Belum ada laporan terbit')).toBeDefined();
    expect(screen.getByText(/Kanal Teknologi/)).toBeDefined();
  });
});
