import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ text: '{"steps":[{"id":"step_1","capabilityId":"command-center.overview.read","arguments":{}}]}', ok: true }));
vi.mock('@/modules/ai/ai-task-query', () => ({
  runTaskQuery: async () => state.ok ? { ok: true, text: state.text } : { ok: false, error: 'provider unavailable' },
}));

import { planOperatorActions } from '@/modules/ai/operator-planner';

beforeEach(() => { state.text = '{"steps":[{"id":"step_1","capabilityId":"command-center.overview.read","arguments":{}}]}'; state.ok = true; });

describe('planOperatorActions', () => {
  it('returns a validated plan without executing it', async () => {
    const result = await planOperatorActions({ request: 'Ringkas dashboard', organizationId: '11111111-1111-4111-8111-111111111111', deps: {} as never });
    expect(result).toMatchObject({ ok: true, executed: false, plan: { steps: [{ capabilityId: 'command-center.overview.read' }] } });
  });

  it('rejects malformed model output', async () => {
    state.text = 'not-json';
    const result = await planOperatorActions({ request: 'Ringkas dashboard', organizationId: '11111111-1111-4111-8111-111111111111', deps: {} as never });
    expect(result).toMatchObject({ ok: false });
  });

  it('returns provider failures without fabricating a plan', async () => {
    state.ok = false;
    const result = await planOperatorActions({ request: 'Ringkas dashboard', organizationId: '11111111-1111-4111-8111-111111111111', deps: {} as never });
    expect(result).toMatchObject({ ok: false, error: 'provider unavailable' });
  });
});
