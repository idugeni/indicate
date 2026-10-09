import { describe, expect, it } from 'vitest';

import { validateOperatorPlan } from '@/modules/ai/operator-plan';

describe('validateOperatorPlan', () => {
  it('accepts a bounded plan with registered read capabilities', () => {
    expect(validateOperatorPlan({ steps: [{ id: 'step_1', capabilityId: 'command-center.overview.read', arguments: {} }] }).ok).toBe(true);
  });

  it('rejects malformed plans and duplicate step identifiers', () => {
    expect(validateOperatorPlan({ steps: [] })).toMatchObject({ ok: false, code: 'INVALID_PLAN' });
    expect(validateOperatorPlan({ steps: [
      { id: 'same', capabilityId: 'command-center.overview.read', arguments: {} },
      { id: 'same', capabilityId: 'command-center.overview.read', arguments: {} },
    ] })).toMatchObject({ ok: false, code: 'DUPLICATE_STEP' });
  });

  it('rejects repeated capabilities in one plan', () => {
    expect(validateOperatorPlan({ steps: [
      { id: 'step_1', capabilityId: 'command-center.overview.read', arguments: {} },
      { id: 'step_2', capabilityId: 'command-center.overview.read', arguments: {} },
    ] })).toMatchObject({ ok: false, code: 'DUPLICATE_STEP' });
  });

  it('rejects unknown capability identifiers', () => {
    expect(validateOperatorPlan({ steps: [{ id: 'step_1', capabilityId: 'system.shell.execute', arguments: {} }] }))
      .toMatchObject({ ok: false, code: 'UNKNOWN_CAPABILITY' });
  });
});
