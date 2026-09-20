// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { SoftBlueHeroActions } from '@/modules/site/components/network/templates/soft-blue/cards/hero-actions';

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

describe('SoftBlueHeroActions', () => {
  it('membuka dialog kanal saat Web Share API absen', async () => {
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    render(<SoftBlueHeroActions slug="berita-x" title="Judul X" />);
    fireEvent.click(screen.getByRole('button', { name: 'Bagikan artikel' }));
    expect(await screen.findByRole('dialog')).toBeDefined();
    expect(screen.getByRole('link', { name: 'Bagikan ke WhatsApp' })).toBeDefined();
    const { toast } = await import('sonner');
    fireEvent.click(screen.getByRole('button', { name: 'Salin tautan artikel' }));
    await vi.waitFor(() => {
      expect(tulis).toHaveBeenCalledWith(expect.stringContaining('berita-x'));
      expect(toast.success).toHaveBeenCalledWith('Tautan tersalin');
    });
  });
});
