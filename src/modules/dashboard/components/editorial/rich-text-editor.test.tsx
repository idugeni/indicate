// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { RichTextEditor } from '@/modules/dashboard/components/editorial/rich-text-editor';

afterEach(() => {
  cleanup();
});

describe('RichTextEditor', () => {
  it('merender toolbar berlabel, kanvas, dan status aksesibel', () => {
    render(<RichTextEditor onDocChange={() => {}} command={async () => null} labelledBy="body-label" />);
    expect(screen.getByRole('toolbar', { name: 'Format teks' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Tebal' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'H2' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Unggah gambar' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Sematan YouTube' })).toBeDefined();
    expect(screen.getByLabelText('Keterangan gambar berikutnya (opsional)')).toBeDefined();
    expect(screen.getByRole('status')).toBeDefined();
  });

  it('menonaktifkan toolbar saat disabled', () => {
    render(<RichTextEditor onDocChange={() => {}} command={async () => null} disabled />);
    expect(screen.getByRole('button', { name: 'Tebal' }).hasAttribute('disabled')).toBe(true);
  });
});
