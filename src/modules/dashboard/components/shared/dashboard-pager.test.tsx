// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { DashboardPager } from '@/modules/dashboard/components/shared/dashboard-pager';

afterEach(() => {
  cleanup();
});

function renderPager(overrides: Partial<Parameters<typeof DashboardPager>[0]> = {}) {
  const onPageChange = vi.fn();
  render(
    <DashboardPager
      startIndex={0}
      visibleCount={20}
      total={25}
      page={1}
      pageCount={2}
      onPageChange={onPageChange}
      {...overrides}
    />,
  );
  return { onPageChange };
}

describe('Pager dasbor', () => {
  it('menampilkan rentang baris yang terlihat', () => {
    renderPager();
    expect(screen.getByRole('status').textContent).toContain('1–20 dari 25');
  });

  it('tidak merender apa pun saat tidak ada baris', () => {
    const { container } = render(
      <DashboardPager startIndex={0} visibleCount={0} total={0} page={1} pageCount={1} onPageChange={vi.fn()} />,
    );
    expect(container.firstChild).toBe(null);
  });

  it('menonaktifkan navigasi di kedua batas', () => {
    renderPager();
    expect(screen.getByLabelText('Ke halaman sebelumnya').getAttribute('aria-disabled')).toBe('true');
    expect(screen.getByLabelText('Ke halaman berikutnya').getAttribute('aria-disabled')).toBe('false');
  });

  it('meminta halaman berikutnya dari halaman pertama', () => {
    const { onPageChange } = renderPager();
    fireEvent.click(screen.getByLabelText('Ke halaman berikutnya'));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('meminta halaman sebelumnya dari halaman kedua', () => {
    const { onPageChange } = renderPager({ startIndex: 20, visibleCount: 5, page: 2 });
    fireEvent.click(screen.getByLabelText('Ke halaman sebelumnya'));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it('tidak memanggil perubahan halaman saat tepi sudah dinonaktifkan', () => {
    const { onPageChange } = renderPager();
    fireEvent.click(screen.getByLabelText('Ke halaman sebelumnya'));
    expect(onPageChange).not.toHaveBeenCalled();
  });

  it('menyebutkan nama daftar pada label ketika halaman punya lebih dari satu pager', () => {
    renderPager({ noun: 'kategori' });
    expect(screen.getByLabelText('Ke halaman kategori sebelumnya')).toBeDefined();
    expect(screen.getByLabelText('Ke halaman kategori berikutnya')).toBeDefined();
  });

  it('menambahkan catatan pada penghitung rentang', () => {
    renderPager({ note: 'termuat' });
    expect(screen.getByRole('status').textContent).toContain('termuat');
  });
});
