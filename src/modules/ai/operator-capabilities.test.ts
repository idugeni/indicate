import { describe, expect, it } from 'vitest';
import { OPERATOR_CAPABILITIES, OPERATOR_EXECUTION_ENABLED } from '@/modules/ai/operator-capabilities';

describe('operator capability catalog', () => {
  it('keeps execution disabled until an executor is verified', () => {
    expect(OPERATOR_EXECUTION_ENABLED).toBe(false);
  });
  it('records all dashboard domains', () => {
    expect(OPERATOR_CAPABILITIES).toHaveLength(19);
  });
  it('uses unique identifiers and only read entries', () => {
    const ids = OPERATOR_CAPABILITIES.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(OPERATOR_CAPABILITIES.every((item) => item.risk === 'read' && !item.requiresApproval)).toBe(true);
  });
});
