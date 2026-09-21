// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { PermissionChecklist } from '@/modules/dashboard/components/shared/permission-checklist';

const OPTIONS = [
  { value: 'article.read', label: 'article.read' },
  { value: 'article.write', label: 'article.write' },
  { value: 'billing.read', label: 'billing.read' },
];

afterEach(() => {
  cleanup();
});

describe('Daftar centang izin', () => {
  it('mengelompokkan opsi berdasarkan awalan izin', () => {
    render(<PermissionChecklist options={OPTIONS} selected={[]} onChange={vi.fn()} />);
    expect(screen.getByText('article')).toBeDefined();
    expect(screen.getByText('billing')).toBeDefined();
    expect(screen.getByRole('checkbox', { name: 'article.read' })).toBeDefined();
    expect(screen.getByRole('checkbox', { name: 'billing.read' })).toBeDefined();
  });

  it('menambahkan izin saat kotak dicentang', () => {
    const handleChange = vi.fn();
    render(<PermissionChecklist options={OPTIONS} selected={[]} onChange={handleChange} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'article.read' }));
    expect(handleChange).toHaveBeenCalledWith(['article.read']);
  });

  it('menghapus izin saat kotak dibatalkan', () => {
    const handleChange = vi.fn();
    render(
      <PermissionChecklist options={OPTIONS} selected={['article.read', 'billing.read']} onChange={handleChange} />,
    );
    fireEvent.click(screen.getByRole('checkbox', { name: 'article.read' }));
    expect(handleChange).toHaveBeenCalledWith(['billing.read']);
  });

  it('mengunci semua kotak saat nonaktif', () => {
    render(<PermissionChecklist options={OPTIONS} selected={[]} disabled onChange={vi.fn()} />);
    expect(screen.getByRole('checkbox', { name: 'article.read' }).getAttribute('aria-disabled')).toBe('true');
    expect(screen.getByRole('checkbox', { name: 'billing.read' }).getAttribute('aria-disabled')).toBe('true');
  });
});
