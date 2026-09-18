// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { DocsOgCard } from '@/app/docs-opengraph-image/og-card';

afterEach(() => {
  cleanup();
});

describe('DocsOgCard', () => {
  it('merender judul dan alamat docs', () => {
    render(<DocsOgCard />);
    expect(screen.getByText('Indicate Docs')).toBeDefined();
    expect(screen.getByText(/API · Webhook · Telegram Reference/)).toBeDefined();
    expect(screen.getByText(/docs\.indicate\.web\.id/)).toBeDefined();
  });
});
