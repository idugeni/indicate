// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { CopyButton } from '@/modules/docs/components/copy-button';

const tulis = vi.hoisted(() => vi.fn(async () => {}));

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  tulis.mockClear();
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: tulis },
    configurable: true,
  });
});

describe('CopyButton', () => {
  it('menyalin teks dan menampilkan status disalin', async () => {
    render(<CopyButton text="teks rahasia" />);
    fireEvent.click(screen.getByRole('button', { name: 'Salin' }));
    expect(tulis).toHaveBeenCalledWith('teks rahasia');
    expect(await screen.findByText('Disalin')).toBeDefined();
  });

  it('memakai label kustom sebagai nama aksesibel', () => {
    render(<CopyButton text="abc" label="Salin perintah" />);
    expect(screen.getByRole('button', { name: 'Salin perintah' })).toBeDefined();
  });
});
