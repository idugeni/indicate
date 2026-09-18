import { describe, expect, it } from 'vitest';

import { createResendEventVerifier } from '@/integrations/email/resend-webhook-verify';

describe('createResendEventVerifier', () => {
  it('mengembalikan fungsi verifier', () => {
    expect(typeof createResendEventVerifier('re_key_123', 'whsec_123')).toBe('function');
  });

  it('menolak payload palsu tanpa memanggil jaringan', () => {
    const verifier = createResendEventVerifier('re_key_123', 'whsec_123');
    expect(() => verifier('{}', { id: 'evt-1', timestamp: '1', signature: 'palsu' })).toThrow();
  });
});
