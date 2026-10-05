// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { OrangeModernQuotePanel } from '@/modules/site/components/network/templates/orange-modern/cards/latest';

afterEach(() => {
  cleanup();
});

describe('OrangeModernQuotePanel', () => {
  it('tautan tentang memakai path relatif per-portal', () => {
    render(<OrangeModernQuotePanel siteName="Portal Contoh" quote="Kebenaran di atas segalanya" />);
    const link = screen.getByRole('link', { name: 'Tentang redaksi' });
    expect(link.getAttribute('href')).toBe('/tentang');
  });
});
