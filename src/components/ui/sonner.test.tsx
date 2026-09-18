// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';

import { Toaster } from '@/components/ui/sonner';

afterEach(() => {
  cleanup();
});

describe('Pemberi roti panggang', () => {
  it('merender daerah notifikasi', () => {
    const { container } = render(<Toaster />);
    expect(container.querySelector('section[aria-label^="Notifications"]')).not.toBe(null);
  });

  it('merender daerah notifikasi posisi atas', () => {
    const { container } = render(<Toaster position="top-center" />);
    expect(container.querySelector('section[aria-label^="Notifications"]')).not.toBe(null);
  });
});
