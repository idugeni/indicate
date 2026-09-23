// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { makeNetworkArticle } from '@/modules/delivery/network-test-fixtures';
import { BlackLimeShareButtons } from '@/modules/site/components/network/templates/black-lime/cards/share-buttons';

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

const artikel = makeNetworkArticle({ id: 'a9', slug: 'berita-utama', title: 'Judul Uji Coba' });
const kanonis = 'https://portal.contoh/berita-utama';

describe('BlackLimeShareButtons', () => {
  it('menampilkan tautan ke semua kanal', () => {
    render(<BlackLimeShareButtons article={artikel} canonical={kanonis} />);
    expect(screen.getByRole('link', { name: 'Bagikan ke WhatsApp' }).getAttribute('href')).toContain('wa.me');
    expect(screen.getByRole('link', { name: 'Bagikan ke X' }).getAttribute('href')).toContain('x.com');
    expect(screen.getByRole('link', { name: 'Bagikan ke Facebook' }).getAttribute('href')).toContain('facebook.com');
    expect(screen.getByRole('link', { name: 'Bagikan ke Telegram' }).getAttribute('href')).toContain('t.me');
    expect(screen.getByRole('link', { name: 'Bagikan via Email' }).getAttribute('href')).toContain('mailto:');
  });

  it('menyalin tautan dan menampilkan status tersalin', async () => {
    render(<BlackLimeShareButtons article={artikel} canonical={kanonis} />);
    fireEvent.click(screen.getByRole('button', { name: 'Salin tautan artikel' }));
    const { toast } = await import('sonner');
    await vi.waitFor(() => {
      expect(tulis).toHaveBeenCalledWith(kanonis);
      expect(toast.success).toHaveBeenCalledWith('Tautan tersalin');
    });
  });
});
