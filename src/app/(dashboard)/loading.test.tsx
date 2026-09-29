// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import DashboardLoading from '@/app/(dashboard)/loading';

afterEach(() => {
  cleanup();
});

describe('Skeleton strada redaksi', () => {
  it('menyatakan sibuk memuat di shell yang menjaga sidebar dan header', () => {
    const { container } = render(<DashboardLoading />);
    const shell = screen.getByLabelText('Memuat ruang redaksi');
    expect(shell.getAttribute('aria-busy')).toBe('true');
    expect(container.querySelector('aside')).not.toBeNull();
    expect(container.querySelector('header')).not.toBeNull();
    expect(container.querySelector('main')).not.toBeNull();
  });

  it('menyembunyikan isi dekoratif dari pembaca layar', () => {
    const { container } = render(<DashboardLoading />);
    expect(container.querySelector('aside')?.getAttribute('aria-hidden')).toBe('true');
    expect(screen.getAllByRole('status').every((node) => node.getAttribute('aria-busy') === 'true')).toBe(true);
  });
});
