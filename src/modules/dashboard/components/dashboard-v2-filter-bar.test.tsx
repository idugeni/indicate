// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { DashboardV2FilterBar } from '@/modules/dashboard/components/dashboard-v2-filter-bar';

afterEach(() => {
  cleanup();
});

describe('Kontrol filter', () => {
  it('meneruskan query pencarian saat diterapkan', () => {
    const onApply = vi.fn();
    render(<DashboardV2FilterBar view="configuration" data={null} onApply={onApply} />);
    fireEvent.change(screen.getByLabelText('Pencarian Portal'), { target: { value: 'semarang' } });
    fireEvent.click(screen.getByRole('button', { name: 'Terapkan' }));
    expect(onApply).toHaveBeenCalledWith(expect.stringContaining('search=semarang'));
  });

  it('mengosongkan query saat filter dibersihkan', () => {
    const onApply = vi.fn();
    render(<DashboardV2FilterBar view="configuration" data={null} onApply={onApply} />);
    fireEvent.change(screen.getByLabelText('Pencarian Portal'), { target: { value: 'semarang' } });
    fireEvent.click(screen.getByRole('button', { name: 'Bersihkan seluruh filter' }));
    expect(onApply).toHaveBeenCalledWith('');
  });

  it('merender medan audit untuk tampilan log keamanan', () => {
    render(<DashboardV2FilterBar view="audit" data={null} onApply={vi.fn()} />);
    expect(screen.getByLabelText('ID Pelaku')).toBeDefined();
    expect(screen.getByLabelText('Tipe Aksi')).toBeDefined();
    expect(screen.getByLabelText('Status Eksekusi')).toBeDefined();
  });

  it('mencari portal dan melaporkan jumlah sebenarnya pada tampilan konfigurasi', () => {
    const onApply = vi.fn();
    render(
      <DashboardV2FilterBar
        view="configuration"
        data={{ sites: [{ id: 'site-1', normalizedHostname: 'jawa-tengah.portal.test' }], siteTotal: 3432, siteTotalInScope: 3432, siteSearch: null }}
        onApply={onApply}
      />,
    );
    expect(screen.getByLabelText('Pencarian Portal')).toBeDefined();
    expect(screen.getByText(/Menampilkan 1 dari 3\.432 portal/)).toBeDefined();
    fireEvent.change(screen.getByLabelText('Pencarian Portal'), { target: { value: 'semarang' } });
    fireEvent.click(screen.getByRole('button', { name: 'Terapkan' }));
    expect(onApply).toHaveBeenCalledWith(expect.stringContaining('search=semarang'));
  });

  it('menerapkan preset rentang cepat untuk tampilan telemetri', () => {
    const onApply = vi.fn();
    render(<DashboardV2FilterBar view="analytics" data={null} onApply={onApply} />);
    expect(screen.getByLabelText('Dari Tanggal')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: '7 Hari Terakhir' }));
    expect(onApply).toHaveBeenCalledWith(expect.stringContaining('from='));
    expect(onApply).toHaveBeenCalledWith(expect.stringContaining('to='));
  });
});
