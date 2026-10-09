// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { DashboardCommand } from '@/modules/dashboard/command';
import { AiControlCenterV2 } from './ai-control-center-v2';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const snapshot = {
  credentials: [{ id: 'cred-1', label: 'Primary key', status: 'active', providerId: 'openrouter' }],
  policy: {
    primaryProviderId: 'openrouter',
    defaultModel: 'model-main',
    fallbackProviderId: 'vercel-gateway',
    fallbackModel: 'model-fallback',
    costMode: 'price',
    chainStrategy: 'fallback',
  },
  chainHealth: [
    {
      providerId: 'openrouter',
      modelName: 'model-main',
      role: 'primary',
      hasCredential: true,
      tripped: false,
      failCount: 0,
    },
  ],
  recentLogs: [
    {
      id: 'log-1',
      channel: 'editorial',
      modelName: 'model-main',
      status: 'success',
      latencyMs: 420,
      totalTokens: 128,
      createdAt: '2026-10-08T12:00:00.000Z',
    },
  ],
  models: [{ id: 'model-1', modelName: 'model-main', isActive: true }],
  stats: {
    totalRequests: 20,
    successfulRequests: 18,
    failedRequests: 2,
    activeKeys: 1,
    cooldownKeys: 0,
    avgLatencyMs: 420,
  },
};

function stubFetch(body: unknown = snapshot, ok = true) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input).length === 0 || init?.method === 'POST')
      throw new Error('Unexpected request');
    return { ok, status: ok ? 200 : 503, json: async () => body };
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const command = vi.fn(async () => ({})) as unknown as DashboardCommand;

describe('AI Control Center V2', () => {
  it('renders operational posture from the existing AI overview contract', async () => {
    const fetchMock = stubFetch();
    render(<AiControlCenterV2 organizationId="org-1" command={command} />);
    expect(await screen.findByRole('heading', { name: 'AI Control Center' })).toBeDefined();
    expect(await screen.findByText('Routing posture')).toBeDefined();
    expect((await screen.findAllByText('openrouter')).length).toBeGreaterThan(0);
    expect(await screen.findByText('90%')).toBeDefined();
    expect((await screen.findAllByText('model-main')).length).toBeGreaterThan(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('organizationId=org-1&view=ai');
  });

  it('shows a retry path when the overview request fails', async () => {
    stubFetch({}, false);
    render(<AiControlCenterV2 organizationId="org-1" command={command} />);
    expect(await screen.findByText(/Data AI belum dapat dimuat/)).toBeDefined();
    expect(screen.getByRole('button', { name: /Muat ulang/ })).toBeDefined();
  });

  it('opens advanced configuration only on explicit user action', async () => {
    stubFetch();
    render(<AiControlCenterV2 organizationId="org-1" command={command} />);
    fireEvent.click(await screen.findByRole('button', { name: /Konfigurasi lanjutan/ }));
    expect(await screen.findByRole('heading', { name: 'Konfigurasi AI lengkap' })).toBeDefined();
    expect(screen.getByRole('button', { name: /Kembali ke Control Center/ })).toBeDefined();
  });

  it('handles a valid but empty activity and chain health without inventing rows', async () => {
    stubFetch({ ...snapshot, chainHealth: [], recentLogs: [], policy: null });
    render(<AiControlCenterV2 organizationId="org-1" command={command} />);
    expect(await screen.findByText('Routing belum dikonfigurasi')).toBeDefined();
    expect(await screen.findByText('Belum ada health chain')).toBeDefined();
    expect(await screen.findByText('Belum ada request tercatat')).toBeDefined();
  });
});
