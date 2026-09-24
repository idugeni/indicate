// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { RecordEditorForm } from '@/modules/dashboard/components/shared/record-editor-form';
import { getEditorConfig } from '@/modules/dashboard/components/shared/record-editor-config';

const CONFIG = getEditorConfig('domains');
if (!CONFIG) throw new Error('konfigurasi editor domain hilang');

const ITEM = { id: 'd-1', version: 2, normalizedHostname: 'apex.example', status: 'active' };

afterEach(() => {
  cleanup();
});

describe('Formulir editor rekaman', () => {
  it('merender judul, identitas versi, dan medan', () => {
    render(
      <RecordEditorForm
        config={CONFIG}
        collectionKey="domains"
        item={ITEM}
        lookups={{}}
        onSaved={vi.fn()}
        onCancel={vi.fn()}
        onSubmit={vi.fn(async () => ({}))}
      />,
    );
    expect(screen.getByText('Ubah domain')).toBeDefined();
    expect(screen.getByText('versi 2')).toBeDefined();
    expect((screen.getByLabelText('Nama domain utama') as HTMLInputElement).value).toBe('apex.example');
  });

  it('mengirim payload normalisasi saat disimpan', async () => {
    const submitMock = vi.fn(async () => ({}));
    const savedMock = vi.fn();
    render(
      <RecordEditorForm
        config={CONFIG}
        collectionKey="domains"
        item={ITEM}
        lookups={{}}
        onSaved={savedMock}
        onCancel={vi.fn()}
        onSubmit={submitMock}
      />,
    );
    fireEvent.change(screen.getByLabelText('Nama domain utama'), { target: { value: 'BARU.EXAMPLE' } });
    fireEvent.click(screen.getByRole('button', { name: /simpan perubahan/i }));
    await waitFor(() =>
      expect(submitMock).toHaveBeenCalledWith(
        'domain.update',
        expect.objectContaining({ id: 'd-1', expectedVersion: 2, normalizedHostname: 'baru.example' }),
      ),
    );
    expect(savedMock).toHaveBeenCalledTimes(1);
  });

  it('tidak memanggil tersimpan saat server mengembalikan null', async () => {
    const savedMock = vi.fn();
    render(
      <RecordEditorForm
        config={CONFIG}
        collectionKey="domains"
        item={ITEM}
        lookups={{}}
        onSaved={savedMock}
        onCancel={vi.fn()}
        onSubmit={vi.fn(async () => null)}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /simpan perubahan/i }));
    await waitFor(() => expect(savedMock).not.toHaveBeenCalled());
  });

  it('memanggil batal saat tombol batal diklik', () => {
    const cancelMock = vi.fn();
    render(
      <RecordEditorForm
        config={CONFIG}
        collectionKey="domains"
        item={ITEM}
        lookups={{}}
        onSaved={vi.fn()}
        onCancel={cancelMock}
        onSubmit={vi.fn(async () => ({}))}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Batal' }));
    expect(cancelMock).toHaveBeenCalledTimes(1);
  });
});
