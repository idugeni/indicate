// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { BlackLimePreferredSourceButton } from '@/modules/site/components/network/templates/black-lime/chrome/preferred-source-button';
import { makeNetworkSite } from '@/modules/delivery/network-test-fixtures';

afterEach(() => {
  cleanup();
});

function tombol() {
  const site = makeNetworkSite();
  render(<BlackLimePreferredSourceButton site={site} />);
  return screen.getByRole('link', { name: `Tambahkan ${site.settings.name} sebagai Sumber Pilihan di Google` });
}

describe('BlackLimePreferredSourceButton', () => {
  it('punya permukaan dan padding supaya label jadi target sentuh sah', () => {
    const className = tombol().getAttribute('class') ?? '';
    expect(className).toMatch(/rounded-full/);
    expect(className).toMatch(/ring-1/);
    expect(className).toMatch(/\bpy-1\.5\b/);
    expect(className).toMatch(/\bpl-4\b/);
  });

  it('pakai cincin yang sama dengan chip ikon sosial footer Black Lime', () => {
    expect(tombol().getAttribute('class')).toMatch(/ring-\[#242b1f\]/);
  });

  it('tetap mempertahankan ikon lime menyala sebagai aksen', () => {
    render(<BlackLimePreferredSourceButton site={makeNetworkSite()} />);
    expect(document.querySelector('span.rounded-full.bg-\\[\\#c5f82a\\]')).not.toBeNull();
  });

  it('menaut ke preferred source tenant dan aman secara rel', () => {
    const link = tombol();
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    expect(link.getAttribute('href')).toContain('google.com');
  });
});