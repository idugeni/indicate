import { describe, expect, it } from 'vitest';

import { BOOTSTRAP_ENVIRONMENTS, SCHEMA_GATE_MODES } from '@/core/config/bootstrap/bootstrap-env';

describe('bootstrap env', () => {
  it('mengunci daftar environment dan mode gate', () => {
    expect([...BOOTSTRAP_ENVIRONMENTS]).toEqual(['development', 'test', 'production']);
    expect([...SCHEMA_GATE_MODES]).toEqual(['contract', 'live']);
  });
});
