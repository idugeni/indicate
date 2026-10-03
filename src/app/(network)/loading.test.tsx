// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import PublicLoading from '@/app/(network)/loading';
import type { TenantBranding } from '@/modules/delivery/tenant-branding';

const spies = vi.hoisted(() => ({
  resolveTenantBranding: vi.fn(),
  loaderProps: [] as unknown[],
  rootLoadingCalls: 0,
}));

vi.mock('@/modules/delivery/tenant-branding', () => ({
  resolveTenantBranding: spies.resolveTenantBranding,
}));

vi.mock('@/modules/site/components/network/network-listing', () => ({
  TemplateLoader: (props: { templateId: unknown; logoUrl: string }) => {
    spies.loaderProps.push(props);
    return <div data-testid="template-loader" />;
  },
}));

vi.mock('@/app/loading', () => ({
  default: () => {
    spies.rootLoadingCalls += 1;
    return <div data-testid="root-loading" />;
  },
}));

const BRANDING: TenantBranding = {
  hostname: 'portal.example',
  templateId: 'dark-navy',
  logoUrl: 'https://portal.example/logo.png',
};

afterEach(() => {
  cleanup();
  spies.loaderProps.length = 0;
  spies.rootLoadingCalls = 0;
  spies.resolveTenantBranding.mockReset();
});

describe('Fallback pemuatan jaringan', () => {
  it('menyerahkan id template dan URL logo tenant ke loader berbrand', async () => {
    spies.resolveTenantBranding.mockResolvedValue(BRANDING);
    render(await PublicLoading());
    expect(screen.getByTestId('template-loader')).toBeDefined();
    expect(spies.loaderProps).toEqual([
      { templateId: 'dark-navy', logoUrl: 'https://portal.example/logo.png' },
    ]);
    expect(spies.rootLoadingCalls).toBe(0);
  });

  it('menurun ke loader tanpa brand saat host bukan situs tenant aktif', async () => {
    spies.resolveTenantBranding.mockResolvedValue(null);
    render(await PublicLoading());
    expect(screen.getByTestId('root-loading')).toBeDefined();
    expect(screen.queryByTestId('template-loader')).toBeNull();
    expect(spies.loaderProps).toHaveLength(0);
  });
});
