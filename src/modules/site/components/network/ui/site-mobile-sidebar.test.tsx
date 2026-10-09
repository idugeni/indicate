// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { createRef, type CSSProperties } from 'react';
import Link from 'next/link';

import { SiteMobileSidebar } from '@/modules/site/components/network/ui/site-mobile-sidebar';

afterEach(() => {
  cleanup();
  document.body.style.overflow = '';
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe('SiteMobileSidebar theme inheritance across portal boundary', () => {
  it('applies the active template palette to the portal root', () => {
    const themeStyle = {
      '--tpl-card': '#131711',
      '--tpl-canvas': '#0a0c07',
      '--tpl-ink': '#f2f5e9',
      '--tpl-muted': '#a3ad9a',
      '--tpl-primary': '#c5f82a',
      '--tpl-ring': '#242b1f',
      '--tpl-scheme': 'dark',
      colorScheme: 'dark',
    } as CSSProperties;

    render(
      <SiteMobileSidebar
        open
        onClose={vi.fn()}
        onFocusReturn={vi.fn()}
        closeRef={createRef<HTMLButtonElement>()}
        inputId="portal-theme-search"
        themeStyle={themeStyle}
      >
        <Link href="/kanal">Kanal</Link>
      </SiteMobileSidebar>,
    );

    const dialog = screen.getByRole('dialog', { name: 'Menu navigasi' });
    const portalRoot = dialog.parentElement;
    expect(portalRoot?.style.getPropertyValue('--tpl-card')).toBe('#131711');
    expect(portalRoot?.style.getPropertyValue('--tpl-canvas')).toBe('#0a0c07');
    expect(portalRoot?.style.getPropertyValue('--tpl-ink')).toBe('#f2f5e9');
    expect(portalRoot?.style.colorScheme).toBe('dark');
  });
});
