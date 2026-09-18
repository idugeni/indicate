// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

afterEach(() => {
  cleanup();
});

describe('Tab', () => {
  it('merender pemicu dan panel aktif', () => {
    render(
      <Tabs defaultValue="satu">
        <TabsList>
          <TabsTrigger value="satu">Satu</TabsTrigger>
          <TabsTrigger value="dua">Dua</TabsTrigger>
        </TabsList>
        <TabsContent value="satu">Isi satu</TabsContent>
        <TabsContent value="dua">Isi dua</TabsContent>
      </Tabs>,
    );
    expect(screen.getByRole('tab', { name: 'Satu' })).toBeDefined();
    expect(screen.getByText('Isi satu')).toBeDefined();
  });

  it('merender slot tab', () => {
    const { container } = render(
      <Tabs defaultValue="satu">
        <TabsList>
          <TabsTrigger value="satu">Satu</TabsTrigger>
        </TabsList>
        <TabsContent value="satu">Isi satu</TabsContent>
      </Tabs>,
    );
    expect(container.querySelector('[data-slot="tabs"]')).not.toBe(null);
  });
});
