import { describe, expect, it } from 'vitest';

import { createInviteSecret, formatInviteCode, hashInviteCode } from '@/modules/dashboard/components/shared/invite-code';

describe('invite-code', () => {
  it('memformat kode sebagai orgId:email:secret', () => {
    expect(formatInviteCode('org-1', 'admin@x.id', 's3cr3t')).toBe('org-1:admin@x.id:s3cr3t');
  });

  it('membuat secret url-safe 32 karakter', async () => {
    const secret = await createInviteSecret();
    expect(secret).toMatch(/^[A-Za-z0-9_-]{32}$/);
  });

  it('menghasilkan hash stabil dan case-insensitive untuk email', async () => {
    const first = await hashInviteCode('org-1', 'Admin@X.id', 's3cr3t');
    const second = await hashInviteCode('org-1', 'admin@x.id', 's3cr3t');
    expect(first).toBe(second);
    expect(first).toMatch(/^[0-9a-f]{64}$/);
  });
});
