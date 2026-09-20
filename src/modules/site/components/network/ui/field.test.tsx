// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { templateThemeStyle } from '@/modules/site/components/network/ui/template-theme';
import {
  TEMPLATE_FIELD_CLASSES,
  templateButtonGhostClasses,
  templateButtonPrimaryClasses,
  TemplateButton,
  templateFieldClasses,
  TemplateInput,
  TemplateSelect,
  TemplateTextarea,
} from '@/modules/site/components/network/ui/field';

const THEME = {
  primary: '#1a5fd0',
  primaryDark: '#155cb8',
  primarySoft: '#e8f0fe',
  ink: '#0f172a',
  muted: '#475569',
  faint: '#94a3b8',
  canvas: '#f5f8fd',
  card: '#ffffff',
  ring: '#e2e8f0',
  scheme: 'light',
} as const;

describe('templateThemeStyle', () => {
  it('memetakan palet ke variabel --tpl-*', () => {
    expect(templateThemeStyle(THEME)).toMatchObject({
      '--tpl-primary': '#1a5fd0',
      '--tpl-on-primary': '#ffffff',
      '--tpl-scheme': 'light',
    });
  });
});

describe('Template field controls', () => {
  it('mengekspos helper kelas shadcn eksplisit tanpa mengubah visual', () => {
    expect(TEMPLATE_FIELD_CLASSES).toContain('var(--tpl-canvas');
    expect(templateFieldClasses('h-11')).toContain('h-11');
    expect(templateButtonPrimaryClasses('px-6')).toContain('var(--tpl-primary');
    expect(templateButtonPrimaryClasses('px-6')).toContain('px-6');
    expect(templateButtonGhostClasses('w-10')).toContain('var(--tpl-faint');
    expect(templateButtonGhostClasses('w-10')).toContain('w-10');
  });

  it('meneruskan props dan kelas tema tanpa varian dark mentah', () => {
    const { unmount } = render(
      <div style={templateThemeStyle(THEME)}>
        <TemplateInput aria-label="nama" placeholder="Nama" className="h-11 rounded-full" />
        <TemplateTextarea aria-label="pesan" />
        <TemplateSelect aria-label="pilih">
          <option value="a">A</option>
        </TemplateSelect>
        <TemplateButton type="submit">Kirim</TemplateButton>
        <TemplateButton variant="ghost" aria-label="tutup">
          X
        </TemplateButton>
      </div>,
    );
    expect(screen.getByPlaceholderText('Nama').className).toContain('var(--tpl-canvas');
    expect(screen.getByRole('button', { name: 'Kirim' }).className).toContain('var(--tpl-primary');
    expect(screen.getByRole('button', { name: 'tutup' }).className).toContain('var(--tpl-faint');
    unmount();
    cleanup();
  });
});
