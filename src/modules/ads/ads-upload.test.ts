import { describe, expect, it } from 'vitest';

import type { AuthorizedTenantActorContext } from '@/core/operation-context';
import { DASHBOARD_PERMISSIONS } from '@/modules/dashboard/permissions';
import { AdsService } from '@/modules/ads/ads-service';
import { type AdsRepository } from '@/modules/ads/ports';
import { adsCreativeUploadSchema } from '@/modules/ads/ads-schemas';
import {
  AD_CREATIVE_UPLOAD_MAX_BYTES,
  AdsUploadRejectedError,
  AdsUploadUnavailableError,
  assertUploadDimensions,
  assertUploadHeaders,
  buildAdCreativeObjectKey,
  extensionForImageType,
  uploadAdCreativeImage,
  type AdCreativeUploadRepository,
  type AdCreativeUploadStorage,
} from '@/modules/ads/ads-upload';

const ORG_ID = '11111111-1111-4111-8111-111111111111';
const CAM_ID = '44444444-4444-4344-8344-444444444444';
const PUBLIC_HOST = 'media.indicate.website';

function actorWithSiteManage(): AuthorizedTenantActorContext {
  return {
    actorType: 'user',
    actorId: 'user-1',
    verifiedAuthUserId: 'auth-1',
    organizationId: ORG_ID,
    permissionSet: new Set([DASHBOARD_PERMISSIONS.siteManage]),
    entryPoint: 'dashboard',
    requestId: 'req-1',
  } as AuthorizedTenantActorContext;
}

function storageHarness(options: { readonly failRepo?: boolean } = {}) {
  const putKeys: string[] = [];
  const deletedKeys: string[] = [];
  const created: unknown[] = [];
  const storage: AdCreativeUploadStorage = {
    putExact: async (key: string) => {
      putKeys.push(key);
      return { etag: null };
    },
    deleteExact: async (key: string) => {
      deletedKeys.push(key);
    },
  };
  const repository: AdCreativeUploadRepository = {
    createUploadedCreative: async (_actor: unknown, input: unknown) => {
      created.push(input);
      if (options.failRepo === true) throw new Error('transaksi gagal');
      return { id: 'cre-1' };
    },
  } as unknown as AdCreativeUploadRepository;
  return { storage, repository, putKeys, deletedKeys, created };
}

const png = (size: number) => new Uint8Array(size).fill(7);

describe('extensionForImageType', () => {
  it('memetakan tipe umum dan membersihkan subtipe asing', () => {
    expect(extensionForImageType('image/jpeg')).toBe('jpg');
    expect(extensionForImageType('image/png')).toBe('png');
    expect(extensionForImageType('IMAGE/WebP')).toBe('webp');
    expect(extensionForImageType('image/x-custom+foo')).toBe('xcustomfoo');
  });
});

describe('buildAdCreativeObjectKey', () => {
  it('membentuk key publik sesuai pola ad-creative', () => {
    expect(buildAdCreativeObjectKey(ORG_ID, 'png')).toMatch(
      /^pub\/o\/11111111-1111-4111-8111-111111111111\/p\/ad-creative\/[0-9a-f-]{36}\.png$/,
    );
  });
});

describe('assertUploadHeaders', () => {
  it('menolak MIME non-image, berkas kosong, dan oversize', () => {
    expect(() => assertUploadHeaders({ bytes: png(10), filename: 'a.pdf', contentType: 'application/pdf' })).toThrow(AdsUploadRejectedError);
    expect(() => assertUploadHeaders({ bytes: new Uint8Array(0), filename: 'a.png', contentType: 'image/png' })).toThrow(AdsUploadRejectedError);
    expect(() => assertUploadHeaders({ bytes: png(AD_CREATIVE_UPLOAD_MAX_BYTES + 1), filename: 'a.png', contentType: 'image/png' })).toThrow(AdsUploadRejectedError);
    expect(() => assertUploadHeaders({ bytes: png(10), filename: 'a.png', contentType: 'image/png' })).not.toThrow();
  });
});

describe('assertUploadDimensions', () => {
  it('menolak dimensi tak terbaca dan sisi di atas 4096px', () => {
    expect(() => assertUploadDimensions(null)).toThrow(AdsUploadRejectedError);
    expect(() => assertUploadDimensions({ width: 4097, height: 10 })).toThrow(AdsUploadRejectedError);
    expect(() => assertUploadDimensions({ width: 10, height: 5000 })).toThrow(AdsUploadRejectedError);
    expect(assertUploadDimensions({ width: 4096, height: 4096 })).toEqual({ width: 4096, height: 4096 });
  });
});

describe('adsCreativeUploadSchema', () => {
  it('menerima field teks opsional dan menolak tautan javascript', () => {
    expect(adsCreativeUploadSchema.safeParse({ campaignId: CAM_ID, href: 'https://pengiklan.example', alt: 'Promo' }).success).toBe(true);
    expect(adsCreativeUploadSchema.safeParse({ campaignId: null }).success).toBe(true);
    expect(adsCreativeUploadSchema.safeParse({ campaignId: CAM_ID, href: 'javascript:x' }).success).toBe(false);
    expect(adsCreativeUploadSchema.safeParse({ campaignId: 'bukan-uuid' }).success).toBe(false);
  });
});

describe('uploadAdCreativeImage', () => {
  it('menyimpan bytes asli ke key publik lalu mencatat kreatif + dimensi', async () => {
    const harness = storageHarness();
    const bytes = png(1024);
    const result = await uploadAdCreativeImage({
      actor: actorWithSiteManage(),
      file: { bytes, filename: 'promo.png', contentType: 'image/png' },
      fields: { campaignId: CAM_ID, alt: 'Promo' },
      repository: harness.repository,
      storage: harness.storage,
      publicHost: PUBLIC_HOST,
      requestId: 'req-1',
      readDimensions: async () => ({ width: 800, height: 600 }),
    });
    expect(result.id).toBe('cre-1');
    expect(harness.putKeys).toHaveLength(1);
    expect(result.imageUrl).toBe(`https://${PUBLIC_HOST}/${harness.putKeys[0]}`);
    expect(harness.putKeys[0]).toMatch(/^pub\/o\/.+\/p\/ad-creative\/.+\.png$/);
    expect(harness.created).toEqual([
      { campaignId: CAM_ID, imageUrl: result.imageUrl, href: undefined, alt: 'Promo', width: 800, height: 600, requestId: 'req-1' },
    ]);
    expect(harness.deletedKeys).toEqual([]);
  });

  it('menolak MIME non-image dan oversize tanpa menyentuh storage', async () => {
    for (const file of [
      { bytes: png(10), filename: 'a.pdf', contentType: 'application/pdf' },
      { bytes: png(AD_CREATIVE_UPLOAD_MAX_BYTES + 1), filename: 'a.png', contentType: 'image/png' },
    ]) {
      const harness = storageHarness();
      await expect(uploadAdCreativeImage({
        actor: actorWithSiteManage(),
        file,
        fields: { campaignId: null },
        repository: harness.repository,
        storage: harness.storage,
        publicHost: PUBLIC_HOST,
        requestId: 'req-1',
        readDimensions: async () => ({ width: 10, height: 10 }),
      })).rejects.toBeInstanceOf(AdsUploadRejectedError);
      expect(harness.putKeys).toEqual([]);
    }
  });

  it('menolak dimensi tak terbaca dan sisi berlebih', async () => {
    for (const readDimensions of [async () => null, async () => ({ width: 5000, height: 10 })] as const) {
      const harness = storageHarness();
      await expect(uploadAdCreativeImage({
        actor: actorWithSiteManage(),
        file: { bytes: png(64), filename: 'a.png', contentType: 'image/png' },
        fields: { campaignId: null },
        repository: harness.repository,
        storage: harness.storage,
        publicHost: PUBLIC_HOST,
        requestId: 'req-1',
        readDimensions,
      })).rejects.toBeInstanceOf(AdsUploadRejectedError);
      expect(harness.putKeys).toEqual([]);
    }
  });

  it('gagal fail-closed tanpa public host dan membersihkan R2 saat transaksi gagal', async () => {
    const noHost = storageHarness();
    await expect(uploadAdCreativeImage({
      actor: actorWithSiteManage(),
      file: { bytes: png(64), filename: 'a.png', contentType: 'image/png' },
      fields: { campaignId: null },
      repository: noHost.repository,
      storage: noHost.storage,
      publicHost: null,
      requestId: 'req-1',
      readDimensions: async () => ({ width: 10, height: 10 }),
    })).rejects.toBeInstanceOf(AdsUploadUnavailableError);
    expect(noHost.putKeys).toEqual([]);

    const failing = storageHarness({ failRepo: true });
    await expect(uploadAdCreativeImage({
      actor: actorWithSiteManage(),
      file: { bytes: png(64), filename: 'a.png', contentType: 'image/png' },
      fields: { campaignId: null },
      repository: failing.repository,
      storage: failing.storage,
      publicHost: PUBLIC_HOST,
      requestId: 'req-1',
      readDimensions: async () => ({ width: 10, height: 10 }),
    })).rejects.toThrow('transaksi gagal');
    expect(failing.putKeys).toHaveLength(1);
    expect(failing.deletedKeys).toEqual(failing.putKeys);
  });
});

describe('AdsService.uploadCreativeImage', () => {
  const deps = (harness: ReturnType<typeof storageHarness>) => ({ storage: harness.storage, publicHost: PUBLIC_HOST });
  const serviceFor = (harness: ReturnType<typeof storageHarness>) => new AdsService(harness.repository as unknown as AdsRepository);

  it('menolak aktor tanpa grant site.manage tanpa menyentuh storage', async () => {
    const harness = storageHarness();
    const actor = { ...actorWithSiteManage(), permissionSet: new Set(['article.read']) };
    const result = await serviceFor(harness).uploadCreativeImage(
      actor,
      { file: { bytes: png(8), filename: 'a.png', contentType: 'image/png' }, campaignId: null },
      deps(harness),
      'req-1',
    );
    expect(result.ok).toBe(false);
    expect(harness.putKeys).toEqual([]);
  });

  it('menolak envelope tanpa berkas dan field tak valid sebagai INVALID_INPUT', async () => {
    const harness = storageHarness();
    const service = serviceFor(harness);
    const missing = await service.uploadCreativeImage(actorWithSiteManage(), { campaignId: null }, deps(harness), 'req-1');
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.error.error.code).toBe('INVALID_INPUT');
    const badField = await service.uploadCreativeImage(
      actorWithSiteManage(),
      { file: { bytes: png(8), filename: 'a.png', contentType: 'image/png' }, campaignId: 'bukan-uuid' },
      deps(harness),
      'req-1',
    );
    expect(badField.ok).toBe(false);
    if (!badField.ok) expect(badField.error.error.code).toBe('INVALID_INPUT');
    expect(harness.putKeys).toEqual([]);
  });

  it('mengembalikan 503 saat storage tidak disuntikkan', async () => {
    const harness = storageHarness();
    const result = await serviceFor(harness).uploadCreativeImage(
      actorWithSiteManage(),
      { file: { bytes: png(8), filename: 'a.png', contentType: 'image/png' }, campaignId: null },
      undefined,
      'req-1',
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.error.code).toBe('DEPENDENCY_UNAVAILABLE');
  });
});
