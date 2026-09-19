// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { DarkNavyEmpty } from '@/modules/site/components/network/templates/dark-navy/ui/empty';

afterEach(() => {
  cleanup();
});

describe('DarkNavyEmpty', () => {
  it('menyebut konteks kanal dalam status kosong', () => {
    render(<DarkNavyEmpty title="Kanal Teknologi" />);
    expect(screen.getByRole('status')).toBeDefined();
    expect(screen.getByText('Belum ada laporan terbit')).toBeDefined();
    expect(screen.getByText(/Kanal Teknologi/)).toBeDefined();
  });
});
