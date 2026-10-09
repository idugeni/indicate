import { describe, expect, it } from 'vitest';
import { OPERATOR_CAPABILITIES, OPERATOR_EXECUTION_ENABLED } from '@/modules/ai/operator-capabilities';

describe('operator capability catalog', () => {
  it('keeps execution disabled until a server executor is verified', () => {
    expect(OPERATOR_EXECUTION_ENABLED).toBe(false);
  });

  it('uses unique stable identifiers', () => {
    const ids = OPERATOR_CAPABILITIES.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
