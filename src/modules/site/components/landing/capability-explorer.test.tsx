// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { CapabilityExplorer } from '@/modules/site/components/landing/capability-explorer';
import { CAPABILITIES } from '@/ui/site/marketing-content';

afterEach(() => {
  cleanup();
});

describe('CapabilityExplorer', () => {
  it('menampilkan judul dan tab sebanyak kemampuan', () => {
    render(<CapabilityExplorer />);
    expect(screen.getByRole('heading', { name: /satu dasbor untuk seluruh kerja redaksi/i })).toBeDefined();
    expect(screen.getAllByRole('tab')).toHaveLength(CAPABILITIES.length);
    expect(screen.getByRole('tab', { selected: true }).textContent).toContain(CAPABILITIES[0]?.title ?? '');
  });

  it('berganti panel saat tab diklik', () => {
    render(<CapabilityExplorer />);
    const tabKedua = screen.getAllByRole('tab')[1] as HTMLElement;
    fireEvent.click(tabKedua);
    expect(tabKedua.getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tabpanel').textContent).toContain(CAPABILITIES[1]?.title ?? '');
  });

  it('tombol berikutnya dan sebelumnya memutar panel', () => {
    render(<CapabilityExplorer />);
    fireEvent.click(screen.getByRole('button', { name: 'Berikutnya' }));
    expect(screen.getByRole('tabpanel').textContent).toContain(CAPABILITIES[1]?.title ?? '');
    fireEvent.click(screen.getByRole('button', { name: 'Sebelumnya' }));
    expect(screen.getByRole('tabpanel').textContent).toContain(CAPABILITIES[0]?.title ?? '');
  });
});
