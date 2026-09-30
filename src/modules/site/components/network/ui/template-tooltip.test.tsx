// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import Link from 'next/link';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TemplateTooltip } from '@/modules/site/components/network/ui/template-tooltip';

afterEach(() => {
  cleanup();
});

describe('TemplateTooltip', () => {
  it('merender elemen anak sebagai pemicu tanpa mengubah atributnya', () => {
    render(
      <TemplateTooltip label="Facebook">
        <a href="https://facebook.com/penerbit" aria-label="Indicate di Facebook">fb</a>
      </TemplateTooltip>,
    );
    const trigger = screen.getByRole('link', { name: 'Indicate di Facebook' });
    expect(trigger.getAttribute('href')).toBe('https://facebook.com/penerbit');
  });

  it('tidak menulis atribut title native', () => {
    render(
      <TemplateTooltip label="Segera hadir di App Store">
        <span>App Store</span>
      </TemplateTooltip>,
    );
    expect(document.querySelector('[title]')).toBe(null);
  });

  it('tidak menampilkan chip sebelum pemicu aktif', () => {
    render(
      <TemplateTooltip label="Telusuri semua kategori">
        <Link href="/search">kategori</Link>
      </TemplateTooltip>,
    );
    expect(screen.queryByText('Telusuri semua kategori')).toBe(null);
  });

  it('menampilkan chip saat pemicu difokuskan lewat keyboard', async () => {
    const user = userEvent.setup();
    render(
      <TemplateTooltip label="Telusuri semua kategori">
        <Link href="/search">kategori</Link>
      </TemplateTooltip>,
    );
    await user.tab();
    await waitFor(() => expect(screen.getByText('Telusuri semua kategori')).toBeDefined());
  });

  it('menampilkan chip saat pemicu dihover', async () => {
    const user = userEvent.setup();
    render(
      <TemplateTooltip label="Salin tautan">
        <button type="button">salin</button>
      </TemplateTooltip>,
    );
    await user.hover(screen.getByRole('button', { name: 'salin' }));
    await waitFor(() => expect(screen.getByText('Salin tautan')).toBeDefined(), { timeout: 2000 });
  });
});
