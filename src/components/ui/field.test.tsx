// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field';

afterEach(() => {
  cleanup();
});

describe('Medan formulir', () => {
  it('merender label dan deskripsi', () => {
    render(
      <Field>
        <FieldLabel>Nama lengkap</FieldLabel>
        <FieldDescription>Tulis nama sesuai identitas</FieldDescription>
      </Field>,
    );
    expect(screen.getByText('Nama lengkap')).toBeDefined();
    expect(screen.getByText('Tulis nama sesuai identitas')).toBeDefined();
  });

  it('merender pesan galat dari daftar', () => {
    render(<FieldError errors={[{ message: 'Wajib diisi' }]} />);
    expect(screen.getByText('Wajib diisi')).toBeDefined();
  });
});
