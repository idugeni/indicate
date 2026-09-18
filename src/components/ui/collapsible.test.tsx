// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

afterEach(() => {
  cleanup();
});

describe('Lipat buka', () => {
  it('menyembunyikan konten saat tertutup', () => {
    render(
      <Collapsible>
        <CollapsibleTrigger>Buka lipatan</CollapsibleTrigger>
        <CollapsibleContent>Isi lipatan</CollapsibleContent>
      </Collapsible>,
    );
    expect(screen.getByRole('button', { name: 'Buka lipatan' })).toBeDefined();
    expect(screen.queryByText('Isi lipatan')).toBe(null);
  });

  it('menampilkan konten saat terbuka bawaan', () => {
    render(
      <Collapsible defaultOpen>
        <CollapsibleTrigger>Buka lipatan</CollapsibleTrigger>
        <CollapsibleContent>Isi lipatan</CollapsibleContent>
      </Collapsible>,
    );
    expect(screen.getByText('Isi lipatan')).toBeDefined();
  });
});
