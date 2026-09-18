// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import {
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

afterEach(() => {
  cleanup();
});

describe('Menu bilah sisi', () => {
  it('merender butir menu', () => {
    render(
      <SidebarMenu>
        <SidebarMenuItem>
          <span>Menu satu</span>
        </SidebarMenuItem>
      </SidebarMenu>,
    );
    expect(screen.getByText('Menu satu')).toBeDefined();
  });

  it('merender konten grup', () => {
    render(
      <SidebarGroupContent>
        <span>Isi grup</span>
      </SidebarGroupContent>,
    );
    expect(screen.getByText('Isi grup')).toBeDefined();
  });
});
