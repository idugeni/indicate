// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { makeNetworkArticle } from '@/modules/delivery/network-test-fixtures';
import { RedEditorialPickCard } from '@/modules/site/components/network/templates/red-editorial/cards/pick-card';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

afterEach(() => {
  cleanup();
});

describe('RedEditorialPickCard', () => {
  it('membuka dialog bagikan dari tombol share card', async () => {
    const article = makeNetworkArticle({
      id: 'a-9',
      slug: 'berita-kota',
      title: 'Berita Kota',
      href: 'https://wonosobo.portal.example/berita-kota',
    });
    render(<RedEditorialPickCard article={article} index={0} />);
    fireEvent.click(screen.getByRole('button', { name: 'Bagikan artikel' }));
    await screen.findByRole('dialog');
    expect(screen.getByRole('link', { name: 'Bagikan ke WhatsApp' }).getAttribute('href')).toContain(
      encodeURIComponent('https://wonosobo.portal.example/berita-kota'),
    );
  });
});
