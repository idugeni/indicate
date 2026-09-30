import { describe, expect, it } from 'vitest';

import {
  accessKeyLoginPath,
  createAccessKeyMaterial,
  deriveAccessKeyHash,
  parseAccessKeyCredential,
  verifyAccessKeySecret,
} from '@/modules/auth/dashboard-access-keys/access-key-service';
import { accessKeyIssueSchema, accessKeyRevokeSchema } from '@/modules/auth/dashboard-access-keys/schemas';

describe('kredensial kunci akses dashboard', () => {
  it('menerbitkan pasangan lookup dan secret yang bisa di-parse kembali', () => {
    const material = createAccessKeyMaterial();
    const parsed = parseAccessKeyCredential(material.plaintext);
    expect(parsed).not.toBeNull();
    expect(parsed?.lookupId).toBe(material.lookupId);
  });

  it('menolak bentuk kredensial yang bukan kunci akses', () => {
    expect(parseAccessKeyCredential('')).toBeNull();
    expect(parseAccessKeyCredential('ind_live_abcdefghijklmnop.secret')).toBeNull();
    expect(parseAccessKeyCredential('inda_pendek.x')).toBeNull();
  });

  it('memverifikasi secret yang benar dan menolak yang salah', async () => {
    const material = createAccessKeyMaterial();
    const parsed = parseAccessKeyCredential(material.plaintext)!;
    const hash = await deriveAccessKeyHash(parsed.secret, material.salt);
    await expect(verifyAccessKeySecret(parsed.secret, material.salt, hash)).resolves.toBe(true);
    await expect(verifyAccessKeySecret(`${parsed.secret.slice(0, -1)}A`, material.salt, hash)).resolves.toBe(false);
  });

  it('membangun path login sekali-klik yang aman URL', () => {
    const material = createAccessKeyMaterial();
    const path = accessKeyLoginPath(material.plaintext);
    expect(path.startsWith('/auth/access-key?key=')).toBe(true);
    expect(decodeURIComponent(path.slice('/auth/access-key?key='.length))).toBe(material.plaintext);
  });
});

describe('skema kunci akses dashboard', () => {
  it('menerima nama dan expiry opsional', () => {
    const parsed = accessKeyIssueSchema.safeParse({ name: 'Laptop cadangan', expiresAt: null });
    expect(parsed.success).toBe(true);
  });

  it('menolak nama kosong', () => {
    expect(accessKeyIssueSchema.safeParse({ name: '  ', expiresAt: null }).success).toBe(false);
  });

  it('menerima revoke dengan id dan versi', () => {
    const parsed = accessKeyRevokeSchema.safeParse({
      accessKeyId: '123e4567-e89b-12d3-a456-426614174000',
      expectedVersion: 1,
    });
    expect(parsed.success).toBe(true);
  });
});
