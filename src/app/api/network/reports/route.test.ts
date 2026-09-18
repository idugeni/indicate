import { describe, expect, it } from 'vitest';

import { reportOutcomeStatus } from '@/app/api/network/reports/route';

describe('reportOutcomeStatus', () => {
  it('memetakan input invalid ke 400', () => {
    expect(reportOutcomeStatus('INVALID_INPUT')).toBe(400);
  });

  it('menjatuhkan kode lain ke 404 non-disclosing', () => {
    expect(reportOutcomeStatus('RESOURCE_UNAVAILABLE')).toBe(404);
    expect(reportOutcomeStatus('DEPENDENCY_UNAVAILABLE')).toBe(404);
  });
});
