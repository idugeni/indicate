// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { PermissionChecklist } from '@/modules/dashboard/components/shared/permission-checklist';

const OPSI = [
  { value: 'article.read', label: 'article.read' },
  { value: 'article.write', label: 'article.write' },
  { value: 'billing.read', label: 'billing.read' },
];

afterEach(() => {
  cleanup();
});

describe('Daftar centang izin', () => {
  it('mengelompokkan opsi berdasarkan awalan izin', () => {
    render(<PermissionChecklist options={OPSI} selected={[]} onChange={vi.fn()} />);
    expect(screen.getByText('article')).toBeDefined();
    expect(screen.getByText('billing')).toBeDefined();
    expect(screen.getByLabelText('article.read')).toBeDefined();
    expect(screen.getByLabelText('billing.read')).toBeDefined();
  });

  it('menambahkan izin saat kotak dicentang', () => {
    const ubah = vi.fn();
    render(<PermissionChecklist options={OPSI} selected={[]} onChange={ubah} />);
    fireEvent.click(screen.getByLabelText('article.read'));
    expect(ubah).toHaveBeenCalledWith(['article.read']);
  });

  it('menghapus izin saat kotak dibatalkan', () => {
    const ubah = vi.fn();
    render(
      <PermissionChecklist options={OPSI} selected={['article.read', 'billing.read']} onChange={ubah} />,
    );
    fireEvent.click(screen.getByLabelText('article.read'));
    expect(ubah).toHaveBeenCalledWith(['billing.read']);
  });

  it('mengunci semua kotak saat nonaktif', () => {
    render(<PermissionChecklist options={OPSI} selected={[]} disabled onChange={vi.fn()} />);
    expect((screen.getByLabelText('article.read') as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText('billing.read') as HTMLInputElement).disabled).toBe(true);
  });
});
