// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { MobileAnchorAd } from '@/modules/ads/mobile-anchor-ad';

afterEach(() => {
  cleanup();
});

describe('MobileAnchorAd', () => {
  it('menampilkan slot beserta tombol tutup', () => {
    render(
      <MobileAnchorAd>
        <p>Slot ponsel</p>
      </MobileAnchorAd>,
    );
    expect(screen.getByText('Slot ponsel')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Tutup iklan' })).toBeDefined();
  });

  it('menghilang setelah tombol tutup ditekan', () => {
    const { container } = render(
      <MobileAnchorAd>
        <p>Slot ponsel</p>
      </MobileAnchorAd>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Tutup iklan' }));
    expect(container.firstChild).toBeNull();
  });
});
