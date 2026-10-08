// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PublicWebContentV2 } from './public-web-content-v2';

vi.mock('@/modules/dashboard/components/content/content-manager', () => ({
  ContentManager: () => <div data-testid="content-editor">Content editor</div>,
}));

afterEach(cleanup);

const bundle = {
  quotes: [{ id: 'q1', author: 'A', quote: 'Good', active: true }],
  faqRows: [{ id: 'f1', question: 'Q?', answer: 'A', active: false }],
  showcase: [{ id: 's1', name: 'Hero', active: true }],
  channels: [{ key: 'email', title: 'Email', active: true }],
  templates: [{ id: 'news', name: 'News', active: true }],
};

describe('PublicWebContentV2', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(bundle), { status: 200 })),
    );
  });

  it('renders public content posture instead of the legacy content tabs', async () => {
    render(<PublicWebContentV2 />);
    expect(
      await screen.findByRole('heading', { name: 'Public Web Content', level: 1 }),
    ).toBeDefined();
    expect(screen.getByText('Public Surface Posture')).toBeDefined();
    expect(screen.queryByText('Jenis konten website')).toBeNull();
  });

  it('opens public component health and filters the surface map', async () => {
    render(<PublicWebContentV2 />);
    fireEvent.click(screen.getByRole('button', { name: /Public Components/ }));
    expect(screen.getByRole('region', { name: 'Public Components' })).toBeDefined();
    fireEvent.change(screen.getByLabelText('Cari public content'), { target: { value: 'faq' } });
    expect(screen.getByText('FAQ')).toBeDefined();
  });

  it('keeps the legacy editor behind an explicit editor action surface', async () => {
    render(<PublicWebContentV2 />);
    fireEvent.click(screen.getByRole('button', { name: /Editor Actions/ }));
    expect(screen.getByTestId('content-editor')).toBeDefined();
  });
});
