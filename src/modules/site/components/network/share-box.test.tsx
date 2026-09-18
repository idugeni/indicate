// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { ShareBox } from '@/modules/site/components/network/share-box';

const tulis = vi.hoisted(() => vi.fn(async () => {}));

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  tulis.mockClear();
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: tulis },
    configurable: true,
  });
});

describe('ShareBox', () => {
  it('menampilkan tautan cadangan setelah tombol Bagikan diklik', () => {
    render(<ShareBox title="Judul Artikel" />);
    expect(screen.getByText('Bagikan artikel')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Bagikan' }));
    expect(screen.getByRole('link', { name: 'WhatsApp' }).getAttribute('href')).toContain('wa.me');
    expect(screen.getByRole('link', { name: 'X' }).getAttribute('href')).toContain('x.com');
    expect(screen.getByRole('link', { name: 'Facebook' }).getAttribute('href')).toContain('facebook.com');
  });

  it('menyalin tautan dan menampilkan status tersalin', async () => {
    render(<ShareBox title="Judul Artikel" />);
    fireEvent.click(screen.getByRole('button', { name: 'Salin tautan' }));
    expect(tulis).toHaveBeenCalledWith(window.location.href);
    expect(await screen.findByText('Tersalin')).toBeDefined();
  });
});
