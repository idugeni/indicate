// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { TemplateSwitcher } from '@/modules/site/components/landing/template-switcher';
import { MASTER_TEMPLATE_PRESETS } from '@/ui/themes';

afterEach(() => {
  cleanup();
});

describe('TemplateSwitcher', () => {
  it('menampilkan seluruh template dan pratinjau bawaan template pertama', () => {
    render(<TemplateSwitcher templates={MASTER_TEMPLATE_PRESETS} />);
    expect(screen.getAllByRole('button')).toHaveLength(MASTER_TEMPLATE_PRESETS.length);
    const first = MASTER_TEMPLATE_PRESETS[0];
    if (!first) throw new Error('preset kosong');
    expect(screen.getByLabelText(`Pratinjau ${first.name}`)).toBeDefined();
  });

  it('mengganti pratinjau saat template dipilih', () => {
    render(<TemplateSwitcher templates={MASTER_TEMPLATE_PRESETS} />);
    const second = MASTER_TEMPLATE_PRESETS[1];
    if (!second) throw new Error('preset kurang dari dua');
    const buttons = screen.getAllByRole('button');
    const target = buttons.find((button) => button.textContent?.includes(second.name));
    if (!target) throw new Error('tombol template kedua hilang');
    fireEvent.click(target);
    expect(screen.getByLabelText(`Pratinjau ${second.name}`)).toBeDefined();
    expect(target.getAttribute('aria-current')).toBe('true');
  });

  it('melabeli varian tiap area template aktif', () => {
    render(<TemplateSwitcher templates={MASTER_TEMPLATE_PRESETS} />);
    expect(screen.getByText('Navbar')).toBeDefined();
    expect(screen.getByText('Hero beranda')).toBeDefined();
    expect(screen.getByText('Footer')).toBeDefined();
  });
});
