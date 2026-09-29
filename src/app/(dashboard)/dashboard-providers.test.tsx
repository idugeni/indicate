// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { DashboardProviders } from '@/app/(dashboard)/dashboard-providers';

afterEach(() => {
  cleanup();
});

describe('DashboardProviders', () => {
  it('membungkus children tanpa mengubah markup-nya', () => {
    render(
      <DashboardProviders>
        <p>Isi modul</p>
      </DashboardProviders>,
    );
    expect(screen.getByText('Isi modul')).toBeDefined();
  });
});
