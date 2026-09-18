import { describe, expect, it } from 'vitest';

import { PUBLISHING_PERMISSIONS, PUBLISHING_PERMISSION_NAMES } from '@/modules/publishing/permissions';

describe('PUBLISHING_PERMISSIONS', () => {
  it('memetakan kunci publikasi ke string permission kanonik', () => {
    expect(PUBLISHING_PERMISSIONS.mediaRead).toBe('media.read');
    expect(PUBLISHING_PERMISSIONS.mediaManage).toBe('media.manage');
    expect(PUBLISHING_PERMISSIONS.publishingRead).toBe('publishing.read');
    expect(PUBLISHING_PERMISSIONS.publishingRequest).toBe('publishing.request');
    expect(PUBLISHING_PERMISSIONS.publishingProcess).toBe('publishing.process');
  });

  it('mendaftarkan semua nilai tanpa duplikat', () => {
    expect(PUBLISHING_PERMISSION_NAMES).toHaveLength(5);
    expect(new Set(PUBLISHING_PERMISSION_NAMES).size).toBe(5);
    for (const value of Object.values(PUBLISHING_PERMISSIONS)) {
      expect(PUBLISHING_PERMISSION_NAMES).toContain(value);
    }
  });
});
