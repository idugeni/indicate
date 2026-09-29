// @vitest-environment jsdom
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { PanelErrorBoundary } from '@/modules/dashboard/components/shared/panel-error-boundary';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function Boom({ throws }: { readonly throws: unknown }): never {
  throw throws;
}

describe('Batas galat panel', () => {
  it('meneruskan children selama tidak ada galat', () => {
    render(
      <PanelErrorBoundary name="Modul Uji">
        <p>Isi panel</p>
      </PanelErrorBoundary>,
    );
    expect(screen.getByText('Isi panel')).toBeDefined();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('menangkap galat render dan menampilkan nama modul serta pesannya', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <PanelErrorBoundary name="Modul Telepon">
        <Boom throws={new Error('jaringan putus')} />
      </PanelErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByText('Modul Telepon gagal dimuat.')).toBeDefined();
    expect(screen.getByText('jaringan putus')).toBeDefined();
  });

  it('memberi pesan generik bila galat bukan Error', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <PanelErrorBoundary name="Modul Aneh">
        <Boom throws={'string liar'} />
      </PanelErrorBoundary>,
    );
    expect(screen.getByText('Modul gagal dimuat.')).toBeDefined();
  });

  it('memulihkan children saat coba lagi ditekan', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    let shouldThrow = true;
    function Flaky(): ReactElement {
      if (shouldThrow) throw new Error('sementara gagal');
      return <p>Sudah pulih</p>;
    }
    render(
      <PanelErrorBoundary name="Modul Berfluktuasi">
        <Flaky />
      </PanelErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toBeDefined();

    shouldThrow = false;
    fireEvent.click(screen.getByRole('button', { name: 'Coba lagi' }));
    expect(screen.getByText('Sudah pulih')).toBeDefined();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
