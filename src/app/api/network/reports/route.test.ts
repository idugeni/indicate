import { describe, expect, it } from 'vitest';

import { reportChallengeDenial, reportOutcomeStatus } from '@/app/api/network/reports/route';

describe('reportOutcomeStatus', () => {
  it('memetakan input invalid ke 400', () => {
    expect(reportOutcomeStatus('INVALID_INPUT')).toBe(400);
  });

  it('memetakan gangguan intake ke 503 agar kanal downed terdeteksi', () => {
    expect(reportOutcomeStatus('DEPENDENCY_UNAVAILABLE')).toBe(503);
  });

  it('menjatuhkan kode lain ke 404 non-disclosing', () => {
    expect(reportOutcomeStatus('RESOURCE_UNAVAILABLE')).toBe(404);
    expect(reportOutcomeStatus('ACCESS_DENIED')).toBe(404);
    expect(reportOutcomeStatus('CONFLICT')).toBe(404);
  });
});

describe('reportChallengeDenial', () => {
  it('menolak token yang ditolak cloudflare dengan 403', () => {
    const denial = reportChallengeDenial('rejected', 'req-1');
    expect(denial.status).toBe(403);
    expect(denial.error.error.code).toBe('FORBIDDEN');
    expect(denial.error.requestId).toBe('req-1');
  });

  it('melaporkan gangguan verifikasi sebagai 503, bukan 403', () => {
    const denial = reportChallengeDenial('unavailable', 'req-2');
    expect(denial.status).toBe(503);
    expect(denial.error.error.code).toBe('DEPENDENCY_UNAVAILABLE');
  });
});
