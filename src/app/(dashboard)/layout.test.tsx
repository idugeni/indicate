// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import DashboardLayout, { metadata } from '@/app/(dashboard)/layout';

afterEach(() => {
  cleanup();
});

describe('Layout dashboard', () => {
  it('membungkus children di dalam wadah scroll dan provider', () => {
    render(
      <DashboardLayout>
        <p>Panel modul</p>
      </DashboardLayout>,
    );
    expect(screen.getByText('Panel modul')).toBeDefined();
    expect(document.querySelector('.dashboard-scroll')).not.toBeNull();
  });

  it('melarang mesin pencari mengindeks control plane', () => {
    expect(metadata.title).toBe('Dashboard');
    expect(metadata.robots).toEqual({
      index: false,
      follow: false,
      googleBot: { index: false, follow: false, noimageindex: true },
    });
  });

  it('menyertakan ikon apple resolution tinggi untuk crawler', () => {
    const icons = metadata.icons as { readonly apple?: string };
    expect(icons.apple).toBe('/apple-icon.png');
  });
});
