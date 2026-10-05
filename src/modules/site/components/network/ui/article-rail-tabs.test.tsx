// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { RailTabs } from '@/modules/site/components/network/ui/article-rail-tabs';

afterEach(() => {
  cleanup();
});

describe('RailTabs', () => {
  it('menampilkan panel terbaru bawaan dan bertukar ke terpopuler', () => {
    render(<RailTabs terbaru={<p>Panel Baru</p>} terpopuler={<p>Panel Populer</p>} />);
    expect(screen.getByText('Panel Baru')).toBeDefined();
    expect(screen.queryByText('Panel Populer')).toBe(null);
    fireEvent.click(screen.getByRole('tab', { name: 'Terpopuler' }));
    expect(screen.getByText('Panel Populer')).toBeDefined();
    expect(screen.queryByText('Panel Baru')).toBe(null);
    expect(screen.getByRole('tab', { name: 'Terpopuler' }).getAttribute('aria-selected')).toBe('true');
  });
});
