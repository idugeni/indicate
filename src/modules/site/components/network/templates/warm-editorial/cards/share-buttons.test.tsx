// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { makeNetworkArticle } from '@/modules/delivery/network-test-fixtures';
import { WarmEditorialShareButtons } from '@/modules/site/components/network/templates/warm-editorial/cards/share-buttons';

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
  Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
});

const artikel = makeNetworkArticle({ id: 'a9', slug: 'berita-utama', title: 'Judul Uji Coba' });
const kanonis = 'https://portal.contoh/berita-utama';

describe('WarmEditorialShareButtons', () => {
  it('membuka dialog kanal alih-alih tautan langsung', async () => {
    render(<WarmEditorialShareButtons article={artikel} canonical={kanonis} />);
    expect(screen.queryByRole('link', { name: 'Bagikan ke WhatsApp' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Bagikan artikel' }));
    expect(await screen.findByRole('dialog')).toBeDefined();
    expect(screen.getByRole('link', { name: 'Bagikan ke WhatsApp' }).getAttribute('href')).toContain('wa.me');
    expect(screen.getByRole('link', { name: 'Bagikan ke WhatsApp' }).getAttribute('href')).toContain(
      encodeURIComponent(kanonis),
    );
    expect(screen.getByRole('link', { name: 'Bagikan ke X' }).getAttribute('href')).toContain('x.com');
    expect(screen.getByRole('link', { name: 'Bagikan ke Facebook' }).getAttribute('href')).toContain('facebook.com');
    expect(screen.getByRole('link', { name: 'Bagikan ke Telegram' }).getAttribute('href')).toContain('t.me');
    expect(screen.getByRole('link', { name: 'Bagikan ke Email' }).getAttribute('href')).toContain('mailto:');
  });

  it('menyalin tautan kanonis dari dialog', async () => {
    render(<WarmEditorialShareButtons article={artikel} canonical={kanonis} />);
    fireEvent.click(screen.getByRole('button', { name: 'Bagikan artikel' }));
    await screen.findByRole('dialog');
    fireEvent.click(screen.getByRole('button', { name: 'Salin tautan artikel' }));
    const { toast } = await import('sonner');
    await vi.waitFor(() => {
      expect(tulis).toHaveBeenCalledWith(kanonis);
      expect(toast.success).toHaveBeenCalledWith('Tautan tersalin');
    });
  });
});
