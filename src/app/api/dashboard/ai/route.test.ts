import { describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => undefined, getAll: () => [], set: () => {} }),
}));

vi.mock('next/server', () => ({
  NextResponse: { json: (body: unknown, init?: ResponseInit) => Response.json(body, init) },
}));

vi.mock('@/core/config/runtime/runtime-context', () => ({
  getServerRuntimeContext: async () => ({ bootstrap: {}, config: {} }),
}));

vi.mock('@/data/client', () => ({ getSharedRuntimeDatabase: () => ({ db: {} }) }));

vi.mock('@/modules/auth/authenticate-dashboard', () => ({
  authenticateDashboardUser: async () => null,
  authorizeDashboardOrganization: async () => null,
}));

vi.mock('@/core/observability/api-access', () => ({
  withApiAccess: (_operation: string, handler: unknown) => handler,
}));

import { asStreamCapableAdapter } from '@/app/api/dashboard/ai/route';

describe('asStreamCapableAdapter', () => {
  it('returns the adapter view when executeStream exists', () => {
    const adapter = {
      execute: async () => ({ text: '', toolCallsExecuted: [] }),
      executeStream: async () => ({ text: '', toolCallsExecuted: [] }),
    };
    expect(asStreamCapableAdapter(adapter)).not.toBeNull();
  });

  it('returns null for single-shot adapters without network', () => {
    expect(asStreamCapableAdapter({ execute: async () => ({ text: '' }) })).toBeNull();
    expect(asStreamCapableAdapter({ execute: 'bukan-fungsi' })).toBeNull();
  });
});
