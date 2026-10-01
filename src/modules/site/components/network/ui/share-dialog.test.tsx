// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { TemplateShareButton } from '@/modules/site/components/network/ui/share-dialog';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const tulis = vi.hoisted(() => vi.fn(async () => {}));

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: tulis },
    configurable: true,
  });
});

describe('TemplateShareButton', () => {
  it('selalu membuka dialog kanal walau Web Share API tersedia', async () => {
    const bagikan = vi.fn(async () => {});
    Object.defineProperty(navigator, 'share', { value: bagikan, configurable: true });
    try {
      render(<TemplateShareButton slug="berita-x" title="Judul X" className="tombol" />);
      fireEvent.click(screen.getByRole('button', { name: 'Bagikan artikel' }));
      expect(await screen.findByRole('dialog')).toBeDefined();
      expect(bagikan).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    }
  });

  it('membuka dialog kanal dan menyalin tautan saat Web Share API absen', async () => {
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    render(<TemplateShareButton slug="berita-x" title="Judul X" className="tombol" />);
    fireEvent.click(screen.getByRole('button', { name: 'Bagikan artikel' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeDefined();
    expect(screen.getByRole('link', { name: 'Bagikan ke WhatsApp' }).getAttribute('href')).toContain(
      'wa.me',
    );
    expect(screen.getByRole('link', { name: 'Bagikan ke X' }).getAttribute('href')).toContain('x.com');
    const { toast } = await import('sonner');
    fireEvent.click(screen.getByRole('button', { name: 'Salin tautan artikel' }));
    await vi.waitFor(() => {
      expect(tulis).toHaveBeenCalledWith(expect.stringContaining('berita-x'));
      expect(toast.success).toHaveBeenCalledWith('Tautan tersalin');
    });
    expect(await screen.findByText('Tautan tersalin!')).toBeDefined();
  });

  it('memakai href absolut apa adanya untuk artikel warisan', async () => {
    render(
      <TemplateShareButton
        slug="berita-x"
        title="Judul X"
        href="https://wonosobo.portal.example/berita-x"
        className="tombol"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Bagikan artikel' }));
    await screen.findByRole('dialog');
    expect(screen.getByRole('link', { name: 'Bagikan ke WhatsApp' }).getAttribute('href')).toContain(
      encodeURIComponent('https://wonosobo.portal.example/berita-x'),
    );
  });

  it('menampilkan lima kanal dalam satu baris di semua lebar layar', async () => {
    render(<TemplateShareButton slug="berita-x" title="Judul X" className="tombol" />);
    fireEvent.click(screen.getByRole('button', { name: 'Bagikan artikel' }));
    const list = (await screen.findByRole('dialog')).querySelector('ul');
    expect(list).not.toBeNull();
    // Lima kanal dalam lima kolom sejak lebar terkecil: `grid-cols-3 sm:grid-cols-5`
    // membelahnya 3 + 2 menjadi dua baris di ponsel.
    expect(list?.className).toContain('grid-cols-5');
    expect(list?.className).not.toContain('grid-cols-3');
  });
});
