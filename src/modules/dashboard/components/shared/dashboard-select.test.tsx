// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { DashboardSelect, DashboardSelectItem } from '@/modules/dashboard/components/shared/dashboard-select';

afterEach(() => cleanup());

describe('DashboardSelect', () => {
  it('menampilkan label opsi, mengirim id via FormData, dan ikut form.reset', async () => {
    const user = userEvent.setup();
    const submitted: { current: FormData | null } = { current: null };
    render(
      <form onSubmit={(e) => { e.preventDefault(); submitted.current = new FormData(e.currentTarget); }}>
        <DashboardSelect name="regionId" placeholder="Pilih wilayah">
          <DashboardSelectItem value="">Semua</DashboardSelectItem>
          <DashboardSelectItem value="r-1">Wonosobo</DashboardSelectItem>
        </DashboardSelect>
        <button type="submit">Kirim</button>
      </form>,
    );
    const trigger = screen.getByRole('combobox');
    expect(trigger.textContent).toContain('Pilih wilayah');
    await user.click(trigger);
    await user.click(await screen.findByRole('option', { name: 'Wonosobo' }));
    expect(trigger.textContent).toContain('Wonosobo');
    await user.click(screen.getByRole('button', { name: 'Kirim' }));
    expect(submitted.current?.get('regionId')).toBe('r-1');
    fireEvent.reset(trigger.closest('form')!);
    expect(trigger.textContent).toContain('Pilih wilayah');
  });

  it('mengikuti defaultValue yang datang belakangan selama belum disentuh', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <DashboardSelect name="domainId" defaultValue="" placeholder="Pilih domain">
        <DashboardSelectItem value="d-1">fakta01.my.id</DashboardSelectItem>
      </DashboardSelect>,
    );
    rerender(
      <DashboardSelect name="domainId" defaultValue="d-1" placeholder="Pilih domain">
        <DashboardSelectItem value="d-1">fakta01.my.id</DashboardSelectItem>
      </DashboardSelect>,
    );
    expect(screen.getByRole('combobox').textContent).toContain('fakta01.my.id');
    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: 'fakta01.my.id' }));
    rerender(
      <DashboardSelect name="domainId" defaultValue="" placeholder="Pilih domain">
        <DashboardSelectItem value="d-1">fakta01.my.id</DashboardSelectItem>
      </DashboardSelect>,
    );
    expect(screen.getByRole('combobox').textContent).toContain('fakta01.my.id');
  });
});
