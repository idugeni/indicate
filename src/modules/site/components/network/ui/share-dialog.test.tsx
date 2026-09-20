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
  it('memakai lembar sistem saat Web Share API tersedia', async () => {
    const bagikan = vi.fn(async () => {});
    Object.defineProperty(navigator, 'share', { value: bagikan, configurable: true });
    try {
      render(<TemplateShareButton slug="berita-x" title="Judul X" className="tombol" />);
      fireEvent.click(screen.getByRole('button', { name: 'Bagikan artikel' }));
      await vi.waitFor(() => {
        expect(bagikan).toHaveBeenCalledWith(
          expect.objectContaining({ title: 'Judul X' }),
        );
      });
      expect(screen.queryByRole('dialog')).toBeNull();
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
});
