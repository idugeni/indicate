import { describe, expect, it } from 'vitest';

import { ensureRequestId, REQUEST_ID_HEADER, resolveRequestId } from '@/core/observability/request-id';
import { orgTag } from '@/modules/dashboard/cache-tags';

describe('resolveRequestId', () => {
  it('memakai ulang id inbound yang well-formed', () => {
    const request = new Request('https://a.test/', { headers: { [REQUEST_ID_HEADER]: 'req_abc-123' } });
    expect(resolveRequestId(request)).toBe('req_abc-123');
  });

  it('membuat baru untuk id rusak atau absen', () => {
    const broken = new Request('https://a.test/', { headers: { [REQUEST_ID_HEADER]: 'ada spasi!' } });
    const minted = resolveRequestId(broken);
    expect(minted).toMatch(/^[0-9a-f-]{36}$/);
    expect(resolveRequestId(new Request('https://a.test/'))).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe('ensureRequestId', () => {
  it('menandai forwarded untuk id valid', () => {
    const headers = new Headers({ [REQUEST_ID_HEADER]: 'req-1' });
    expect(ensureRequestId(headers)).toEqual({ requestId: 'req-1', forwarded: true });
  });

  it('membuat baru dan menandai tidak forwarded', () => {
    const { requestId, forwarded } = ensureRequestId(new Headers());
    expect(forwarded).toBe(false);
    expect(requestId).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe('orgTag', () => {
  it('membentuk tag organisasi tunggal', () => {
    expect(orgTag('org-1')).toBe('org:org-1');
  });
});
