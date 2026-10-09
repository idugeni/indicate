// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { SiteHeaderBar } from '@/modules/site/components/network/ui/site-header-bar';

afterEach(() => cleanup());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

function renderHeader(layout: 'centered' | 'masthead') {
  return render(
    <SiteHeaderBar
      brand={<span>Brand Uji</span>}
      nav={<nav aria-label="Nav uji" />}
      sidebar={<nav aria-label="Menu uji" />}
      inputId="header-test-search"
      searchSkin={{ panelBorder: '#ddd', panelBackground: '#fff', inputId: 'header-test-panel' }}
      layout={layout}
    />,
  );
}

describe('SiteHeaderBar responsive brand alignment', () => {
  it.each(['centered', 'masthead'] as const)(
    'keeps the %s brand left-aligned on mobile and centered on desktop',
    (layout) => {
      renderHeader(layout);
      const brandContainer = screen.getByText('Brand Uji').parentElement;
      expect(brandContainer?.className).toContain('w-full');
      expect(brandContainer?.className).toContain('justify-self-start');
      expect(brandContainer?.className).toContain('lg:justify-self-center');
    },
  );
});
