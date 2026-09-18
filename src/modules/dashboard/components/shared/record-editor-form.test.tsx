// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { RecordEditorForm } from '@/modules/dashboard/components/shared/record-editor-form';
import { getEditorConfig } from '@/modules/dashboard/components/shared/record-editor-config';

const KONFIG = getEditorConfig('domains');
if (!KONFIG) throw new Error('konfigurasi editor domain hilang');

const BUTIR = { id: 'd-1', version: 2, normalizedHostname: 'apex.example', status: 'active' };

afterEach(() => {
  cleanup();
});

describe('Formulir editor rekaman', () => {
  it('merender judul, identitas versi, dan medan', () => {
    render(
      <RecordEditorForm
        config={KONFIG}
        collectionKey="domains"
        item={BUTIR}
        lookups={{}}
        onSaved={vi.fn()}
        onCancel={vi.fn()}
        onSubmit={vi.fn(async () => ({}))}
      />,
    );
    expect(screen.getByText('Ubah domain')).toBeDefined();
    expect(screen.getByText('ID d-1 · versi 2')).toBeDefined();
    expect((screen.getByLabelText('Hostname apex') as HTMLInputElement).value).toBe('apex.example');
  });

  it('mengirim payload normalisasi saat disimpan', async () => {
    const kirim = vi.fn(async () => ({}));
    const tersimpan = vi.fn();
    render(
      <RecordEditorForm
        config={KONFIG}
        collectionKey="domains"
        item={BUTIR}
        lookups={{}}
        onSaved={tersimpan}
        onCancel={vi.fn()}
        onSubmit={kirim}
      />,
    );
    fireEvent.change(screen.getByLabelText('Hostname apex'), { target: { value: 'BARU.EXAMPLE' } });
    fireEvent.click(screen.getByRole('button', { name: /simpan perubahan/i }));
    await waitFor(() =>
      expect(kirim).toHaveBeenCalledWith(
        'domain.update',
        expect.objectContaining({ id: 'd-1', expectedVersion: 2, normalizedHostname: 'baru.example' }),
      ),
    );
    expect(tersimpan).toHaveBeenCalledTimes(1);
  });

  it('tidak memanggil tersimpan saat server mengembalikan null', async () => {
    const tersimpan = vi.fn();
    render(
      <RecordEditorForm
        config={KONFIG}
        collectionKey="domains"
        item={BUTIR}
        lookups={{}}
        onSaved={tersimpan}
        onCancel={vi.fn()}
        onSubmit={vi.fn(async () => null)}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /simpan perubahan/i }));
    await waitFor(() => expect(tersimpan).not.toHaveBeenCalled());
  });

  it('memanggil batal saat tombol batal diklik', () => {
    const batal = vi.fn();
    render(
      <RecordEditorForm
        config={KONFIG}
        collectionKey="domains"
        item={BUTIR}
        lookups={{}}
        onSaved={vi.fn()}
        onCancel={batal}
        onSubmit={vi.fn(async () => ({}))}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Batal' }));
    expect(batal).toHaveBeenCalledTimes(1);
  });
});
