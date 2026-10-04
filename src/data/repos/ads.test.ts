import { describe, expect, it } from 'vitest';

import type { AuthorizedTenantActorContext } from '@/core/operation-context';
import { DASHBOARD_PERMISSIONS } from '@/modules/dashboard/permissions';
import { DrizzleAdsRepository } from '@/data/repos/ads';
import { AdsConflictError, AdsNotFoundError } from '@/modules/ads/ports';

const ADV_ID = '22222222-2222-4222-8222-222222222222';
const CRE_ID = '33333333-3333-4333-8333-333333333333';
const CAM_ID = '44444444-4444-4344-8344-444444444444';
const PLA_ID = '55555555-5555-4555-8555-555555555555';

function actor(): AuthorizedTenantActorContext {
  return {
    actorType: 'user',
    actorId: 'user-1',
    verifiedAuthUserId: 'auth-1',
    organizationId: 'org-1',
    permissionSet: new Set([DASHBOARD_PERMISSIONS.siteManage]),
    entryPoint: 'dashboard',
    requestId: 'req-1',
  } as AuthorizedTenantActorContext;
}

function harness(options: {
  readonly updateRows?: readonly { readonly version: number }[];
  readonly updateError?: unknown;
  readonly deleteRows?: readonly { readonly id: string }[];
  readonly deleteError?: unknown;
} = {}) {
  const auditLog: unknown[] = [];
  const transaction = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'execute') return async () => [];
        if (prop === 'insert') return () => ({ values: async (row: unknown) => { auditLog.push(row); return []; } });
        if (prop === 'update') {
          return () => ({
            set: () => ({
              where: () => ({
                returning: async () => {
                  if (options.updateError !== undefined) throw options.updateError;
                  return options.updateRows ?? [{ version: 2 }];
                },
              }),
            }),
          });
        }
        if (prop === 'delete') {
          return () => ({
            where: () => ({
              returning: async () => {
                if (options.deleteError !== undefined) throw options.deleteError;
                return options.deleteRows ?? [{ id: 'row-1' }];
              },
            }),
          });
        }
        return () => transaction;
      },
    },
  );
  const database = { transaction: async (callback: (tx: unknown) => unknown) => callback(transaction) };
  const repository = new DrizzleAdsRepository(database as never);
  return { repository, auditLog };
}

describe('DrizzleAdsRepository ubah & hapus', () => {
  it('memperbarui pengiklan dan mencatat audit', async () => {
    const { repository, auditLog } = harness();
    await expect(repository.updateAdvertiser(actor(), { id: ADV_ID, name: 'Pengiklan Baru', expectedVersion: 1, requestId: 'req-1' })).resolves.toEqual({ version: 2 });
    expect(auditLog).toHaveLength(1);
  });

  it('menolak ubahan basi sebagai konflik versi', async () => {
    const { repository } = harness({ updateRows: [] });
    await expect(repository.updateAdvertiser(actor(), { id: ADV_ID, name: 'Pengiklan Baru', expectedVersion: 1, requestId: 'req-1' })).rejects.toBeInstanceOf(AdsConflictError);
    await expect(harness({ updateRows: [] }).repository.updateCampaign(actor(), { id: CAM_ID, name: 'K Baru', expectedVersion: 1, requestId: 'req-1' })).rejects.toBeInstanceOf(AdsConflictError);
    await expect(harness({ updateRows: [] }).repository.updateCreative(actor(), { id: CRE_ID, kind: 'image', imageUrl: 'https://cdn.example/b.png', expectedVersion: 1, requestId: 'req-1' })).rejects.toBeInstanceOf(AdsConflictError);
  });

  it('memperbarui kampanye dan kreatif', async () => {
    const { repository } = harness();
    await expect(repository.updateCampaign(actor(), { id: CAM_ID, priority: 5, startsAt: null, endsAt: null, expectedVersion: 3, requestId: 'req-1' })).resolves.toEqual({ version: 2 });
    await expect(repository.updateCreative(actor(), { id: CRE_ID, kind: 'html', html: '<div>baru</div>', expectedVersion: 3, requestId: 'req-1' })).resolves.toEqual({ version: 2 });
  });

  it('memetakan kampanye kreatif yang hilang menjadi tidak-ditemukan', async () => {
    const { repository } = harness({ updateError: { code: '23503' } });
    await expect(repository.updateCreative(actor(), { id: CRE_ID, kind: 'image', campaignId: CAM_ID, expectedVersion: 1, requestId: 'req-1' })).rejects.toBeInstanceOf(AdsNotFoundError);
  });

  it('menghapus penempatan dan mencatat audit', async () => {
    const { repository, auditLog } = harness();
    await expect(repository.deletePlacement(actor(), { id: PLA_ID, requestId: 'req-1' })).resolves.toBeUndefined();
    expect(auditLog).toHaveLength(1);
  });

  it('melaporkan hapusan baris hilang sebagai tidak-ditemukan', async () => {
    const { repository } = harness({ deleteRows: [] });
    await expect(repository.deleteAdvertiser(actor(), { id: ADV_ID, requestId: 'req-1' })).rejects.toBeInstanceOf(AdsNotFoundError);
    await expect(repository.deletePlacement(actor(), { id: PLA_ID, requestId: 'req-1' })).rejects.toBeInstanceOf(AdsNotFoundError);
  });

  it('memetakan hapusan terhalang FK menjadi konflik berpesan jelas', async () => {
    const blocked = { deleteError: { code: '23503' } };
    const advertiserError = await harness(blocked).repository.deleteAdvertiser(actor(), { id: ADV_ID, requestId: 'req-1' }).then(
      () => null,
      (error: unknown) => error,
    );
    expect(advertiserError).toBeInstanceOf(AdsConflictError);
    expect((advertiserError as Error).message).toContain('kampanye');
    await expect(harness(blocked).repository.deleteCampaign(actor(), { id: CAM_ID, requestId: 'req-1' })).rejects.toBeInstanceOf(AdsConflictError);
    await expect(harness(blocked).repository.deleteCreative(actor(), { id: CRE_ID, requestId: 'req-1' })).rejects.toBeInstanceOf(AdsConflictError);
  });
});

describe('DrizzleAdsRepository unggah kreatif', () => {
  function uploadHarness(options: { readonly insertError?: unknown } = {}) {
    const inserted: unknown[] = [];
    const transaction = {
      execute: async () => [],
      insert: () => ({
        values: async (row: unknown) => {
          if (options.insertError !== undefined) throw options.insertError;
          inserted.push(row);
          return [];
        },
      }),
    };
    const database = { transaction: async (callback: (tx: unknown) => unknown) => callback(transaction) };
    return { repository: new DrizzleAdsRepository(database as never), inserted };
  }

  it('menyimpan kreatif gambar + audit dalam satu transaksi', async () => {
    const { repository, inserted } = uploadHarness();
    await expect(repository.createUploadedCreative(actor(), {
      campaignId: CAM_ID,
      imageUrl: 'https://media.indicate.website/pub/o/org-1/p/ad-creative/kreatif.png',
      width: 800,
      height: 600,
      requestId: 'req-1',
    })).resolves.toEqual({ id: expect.any(String) });
    expect(inserted).toHaveLength(2);
  });

  it('memetakan kampanye yang hilang menjadi tidak-ditemukan', async () => {
    const { repository } = uploadHarness({ insertError: { code: '23503' } });
    await expect(repository.createUploadedCreative(actor(), {
      campaignId: CAM_ID,
      imageUrl: 'https://media.indicate.website/pub/o/org-1/p/ad-creative/kreatif.png',
      width: 800,
      height: 600,
      requestId: 'req-1',
    })).rejects.toBeInstanceOf(AdsNotFoundError);
  });
});
