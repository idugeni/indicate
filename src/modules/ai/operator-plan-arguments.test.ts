import { describe, expect, it } from 'vitest';
import { validateOperatorPlan } from '@/modules/ai/operator-plan';

describe('operator argument schemas', () => {
  it('accepts bounded search arguments', () => {
    expect(validateOperatorPlan({ steps: [{ id: 'step_1', capabilityId: 'content-library.articles.read', arguments: { search: 'ekonomi', limit: 10 } }] }).ok).toBe(true);
  });
  it('rejects unknown argument keys', () => {
    expect(validateOperatorPlan({ steps: [{ id: 'step_1', capabilityId: 'content-library.articles.read', arguments: { unexpected: true } }] })).toMatchObject({ ok: false, code: 'INVALID_PLAN' });
  });
});
