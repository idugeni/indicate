// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { OrangeModernEmpty } from '@/modules/site/components/network/templates/orange-modern/ui/empty';

afterEach(() => {
  cleanup();
});

describe('OrangeModernEmpty', () => {
  it('menyebut konteks kanal dalam status kosong', () => {
    render(<OrangeModernEmpty title="Kanal Teknologi" />);
    expect(screen.getByRole('status')).toBeDefined();
    expect(screen.getByText('Belum ada laporan terbit')).toBeDefined();
    expect(screen.getByText(/Kanal Teknologi/)).toBeDefined();
  });
});
