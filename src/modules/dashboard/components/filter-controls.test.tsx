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
    expect(screen.getByLabelText('Wilayah regional')).toBeDefined();
    expect(screen.getByLabelText('Kanal (site)')).toBeDefined();
    expect(screen.getByLabelText('Kategori')).toBeDefined();
    expect(screen.getByLabelText('Cari judul / slug')).toBeDefined();
  });

  it('meneruskan query pencarian saat diterapkan', () => {
    const terapkan = vi.fn();
    render(<FilterControls view="editorial" data={null} onApply={terapkan} />);
    fireEvent.change(screen.getByLabelText('Cari judul / slug'), { target: { value: 'kabar' } });
    fireEvent.click(screen.getByRole('button', { name: 'Terapkan' }));
    expect(terapkan).toHaveBeenCalledWith(expect.stringContaining('search=kabar'));
  });

  it('mengosongkan query saat filter dibersihkan', () => {
    const terapkan = vi.fn();
    render(<FilterControls view="editorial" data={null} onApply={terapkan} />);
    fireEvent.click(screen.getByRole('button', { name: 'Bersihkan filter' }));
    expect(terapkan).toHaveBeenCalledWith('');
  });

  it('merender medan audit untuk tampilan log keamanan', () => {
    render(<FilterControls view="audit" data={null} onApply={vi.fn()} />);
    expect(screen.getByLabelText('Aktor (ID)')).toBeDefined();
    expect(screen.getByLabelText('Tipe aksi')).toBeDefined();
    expect(screen.getByLabelText('Hasil transaksi')).toBeDefined();
  });
});
