// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { FormNotice } from '@/modules/dashboard/components/shared/form-notice';

afterEach(() => {
  cleanup();
});

describe('FormNotice', () => {
  it('merender error sebagai alert', () => {
    render(<FormNotice tone="error">Gagal menyimpan</FormNotice>);
    expect(screen.getByRole('alert').textContent).toBe('Gagal menyimpan');
  });

  it('merender success dan muted sebagai status', () => {
    const { unmount } = render(<FormNotice tone="success">Tersimpan</FormNotice>);
    expect(screen.getByRole('status').textContent).toBe('Tersimpan');
    unmount();
    cleanup();
    render(<FormNotice tone="muted">Info saja</FormNotice>);
    expect(screen.getByRole('status').textContent).toBe('Info saja');
  });
});
