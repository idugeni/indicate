// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { FilterControls } from '@/modules/dashboard/components/filter-controls';

afterEach(() => {
  cleanup();
});

describe('Kontrol filter', () => {
  it('tidak merender apa pun untuk tampilan dasbor', () => {
    const { container } = render(<FilterControls view="dashboard" data={null} onApply={vi.fn()} />);
    expect(container.firstChild).toBe(null);
  });

  it('merender empat medan untuk tampilan redaksi', () => {
    render(<FilterControls view="editorial" data={null} onApply={vi.fn()} />);
    expect(screen.getByLabelText('Wilayah')).toBeDefined();
    expect(screen.getByLabelText('Situs')).toBeDefined();
    expect(screen.getByLabelText('Kategori')).toBeDefined();
    expect(screen.getByLabelText('Cari judul')).toBeDefined();
  });

  it('meneruskan query pencarian saat diterapkan', () => {
    const onApply = vi.fn();
    render(<FilterControls view="editorial" data={null} onApply={onApply} />);
    fireEvent.change(screen.getByLabelText('Cari judul'), { target: { value: 'kabar' } });
    fireEvent.click(screen.getByRole('button', { name: 'Terapkan' }));
    expect(onApply).toHaveBeenCalledWith(expect.stringContaining('search=kabar'));
  });

  it('mengosongkan query saat filter dibersihkan', () => {
    const onApply = vi.fn();
    render(<FilterControls view="editorial" data={null} onApply={onApply} />);
    fireEvent.click(screen.getByRole('button', { name: 'Bersihkan filter' }));
    expect(onApply).toHaveBeenCalledWith('');
  });

  it('merender medan audit untuk tampilan log keamanan', () => {
    render(<FilterControls view="audit" data={null} onApply={vi.fn()} />);
    expect(screen.getByLabelText('Pelaku (ID)')).toBeDefined();
    expect(screen.getByLabelText('Jenis Aksi')).toBeDefined();
    expect(screen.getByLabelText('Hasil')).toBeDefined();
  });

  it('mencari portal dan melaporkan jumlah sebenarnya pada tampilan konfigurasi', () => {
    const onApply = vi.fn();
    render(
      <FilterControls
        view="configuration"
        data={{ sites: [{ id: 'site-1', normalizedHostname: 'jawa-tengah.portal.test' }], siteTotal: 3432, siteTotalInScope: 3432, siteSearch: null }}
        onApply={onApply}
      />,
    );
    expect(screen.getByLabelText('Cari portal')).toBeDefined();
    expect(screen.getByText(/Menampilkan 1 dari 3\.432 portal/)).toBeDefined();
    fireEvent.change(screen.getByLabelText('Cari portal'), { target: { value: 'semarang' } });
    fireEvent.click(screen.getByRole('button', { name: 'Terapkan' }));
    expect(onApply).toHaveBeenCalledWith(expect.stringContaining('search=semarang'));
  });

  it('menerapkan preset rentang cepat untuk tampilan telemetri', () => {
    const onApply = vi.fn();
    render(<FilterControls view="analytics" data={null} onApply={onApply} />);
    expect(screen.getByLabelText('Dari tanggal')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: '7 hari' }));
    expect(onApply).toHaveBeenCalledWith(expect.stringContaining('from='));
    expect(onApply).toHaveBeenCalledWith(expect.stringContaining('to='));
  });
});
