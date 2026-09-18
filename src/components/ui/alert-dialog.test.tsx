// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { AlertDialog, AlertDialogTrigger } from '@/components/ui/alert-dialog';

afterEach(() => {
  cleanup();
});

describe('AlertDialog pemicu', () => {
  it('merender tombol pemicu', () => {
    render(
      <AlertDialog>
        <AlertDialogTrigger>Hapus data</AlertDialogTrigger>
      </AlertDialog>,
    );
    expect(screen.getByRole('button', { name: 'Hapus data' })).toBeDefined();
  });

  it('tidak merender konten saat tertutup', () => {
    render(
      <AlertDialog>
        <AlertDialogTrigger>Hapus data</AlertDialogTrigger>
      </AlertDialog>,
    );
    expect(screen.queryByRole('alertdialog')).toBe(null);
  });
});
