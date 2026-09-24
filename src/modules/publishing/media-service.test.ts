import { describe, expect, it, vi } from 'vitest';

import { MediaService } from '@/modules/publishing/media-service';
import {
  PublishingAccessDeniedError,
  PublishingConflictError,
  PublishingSubscriptionInactiveError,
} from '@/modules/publishing/ports';

const NOW = new Date('2026-09-18T14:00:00.000Z');
const CHECKSUM = `${'A'.repeat(43)}=`;
const ARTICLE = '0199a2b3-4c5d-7e8f-9012-3456789abcde';
const MEDIA = '0199a2b3-4c5d-7e8f-9012-3456789abcdf';
const ORG = '0199a2b3-4c5d-7e8f-9012-3456789abc00';

const actor = {
  actorType: 'api_key',
  actorId: 'key-1',
  organizationId: ORG,
  permissionSet: new Set<string>(),
  entryPoint: 'api',
  requestId: 'req-1',
} as const;

const POLICY = { maxBytes: 5_000_000, allowedTypes: ['image/jpeg'], uploadTtlSeconds: 600, readTtlSeconds: 300 };

const upload = {
  filename: 'foto.jpg',
  mediaType: 'image/jpeg',
  sizeBytes: 1_000,
  checksum: CHECKSUM,
  purpose: 'article-image',
  owner: { kind: 'article', articleId: ARTICLE },
};

function harness(repoOverrides: Record<string, unknown> = {}, storageOverrides: Record<string, unknown> = {}) {
  let counter = 0;
  const repository = {
    reserveMediaCandidate: vi.fn(async () => ({ kind: 'reserved', reservation: { id: 'res-1' } })),
    markReservationOccupied: vi.fn(async () => undefined),
    readReservation: vi.fn(async () => null),
    activateMedia: vi.fn(async () => ({ id: MEDIA })),
    rejectMedia: vi.fn(async () => undefined),
    listMedia: vi.fn(async () => [{ id: MEDIA }]),
    authorizeTenantMedia: vi.fn(async () => ({ id: MEDIA, objectKey: 'org/object.jpg' })),
    authorizePublicMedia: vi.fn(async () => ({ id: MEDIA, objectKey: 'org/object.jpg' })),
    archiveMedia: vi.fn(async () => ({ id: MEDIA, state: 'archived' })),
    recordDenial: vi.fn(async () => undefined),
    ...repoOverrides,
  };
  const storage = {
    headExact: vi.fn(async () => null),
    authorizeExactPut: vi.fn(async () => ({ url: 'https://put.example', headers: {} })),
    authorizeExactGet: vi.fn(async () => ({ url: 'https://get.example', headers: {} })),
    ...storageOverrides,
  };
  const service = new MediaService(repository as never, storage as never, { create: () => `collision${String(counter += 1).padStart(4, '0')}abcdef` }, POLICY, {
    now: () => NOW,
  });
  return { repository, storage, service };
}

describe('MediaService reserveUpload', () => {
  it('menolak payload rusak', async () => {
    const { service } = harness();
    const result = await service.reserveUpload(actor, {});
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('INVALID_INPUT');
  });

  it('menolak owner organisasi dari aktor terkunci region', async () => {
    const { service } = harness();
    const locked = { ...actor, regionScopeId: 'region-1' };
    const result = await service.reserveUpload(locked, { ...upload, owner: { kind: 'organization' } });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('RESOURCE_UNAVAILABLE');
  });

  it('menolak tipe tak didukung dan ukuran berlebih dengan field', async () => {
    const { service } = harness();
    const badType = await service.reserveUpload(actor, { ...upload, mediaType: 'video/mp4' });
    expect(badType.ok).toBe(false);
    if (badType.ok) throw new Error('expected error');
    expect(badType.error.error.fields?.mediaType).toBeDefined();

    const badSize = await service.reserveUpload(actor, { ...upload, sizeBytes: 99_000_000 });
    expect(badSize.ok).toBe(false);
    if (badSize.ok) throw new Error('expected error');
    expect(badSize.error.error.fields?.sizeBytes).toBeDefined();
  });

  it('mencadangkan key dan mengembalikan otorisasi put', async () => {
    const { service, storage } = harness();
    const result = await service.reserveUpload(actor, upload);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.value.reservationId).toBeTruthy();
    expect(storage.authorizeExactPut).toHaveBeenCalledTimes(1);
  });

  it('memberi prefix publik untuk purpose artikel dan privat untuk lainnya', async () => {
    const seen: string[] = [];
    const capture = {
      reserveMediaCandidate: vi.fn(async (_actor: unknown, input: { objectKey: string }) => {
        seen.push(input.objectKey);
        return { kind: 'reserved', reservation: { id: 'res-9' } };
      }),
    };
    const { service } = harness(capture as Record<string, unknown>);
    const cover = await service.reserveUpload(actor, { ...upload, purpose: 'article-cover' });
    expect(cover.ok).toBe(true);
    const logo = await service.reserveUpload(actor, { ...upload, purpose: 'site-logo', owner: { kind: 'organization' } });
    expect(logo.ok).toBe(true);
    expect(seen[0]).toMatch(/^pub\//);
    expect(seen[1]).not.toMatch(/^pub\//);
  });

  it('melewati kandidat occupied lalu berhasil', async () => {
    let calls = 0;
    const { service, repository } = harness({
      reserveMediaCandidate: async () => {
        calls += 1;
        return calls === 1 ? { kind: 'occupied' } : { kind: 'reserved', reservation: { id: 'res-2' } };
      },
    });
    const result = await service.reserveUpload(actor, upload);
    expect(result.ok).toBe(true);
    expect(repository.markReservationOccupied).not.toHaveBeenCalled();
  });

  it('konflik saat semua kandidat terisi', async () => {
    const shortPolicy = { ...POLICY, reservationAttempts: 2 };
    const repository = {
      reserveMediaCandidate: vi.fn(async () => ({ kind: 'occupied' })),
      markReservationOccupied: vi.fn(async () => undefined),
      recordDenial: vi.fn(async () => undefined),
    };
    const storage = { headExact: vi.fn(async () => null), authorizeExactPut: vi.fn(), authorizeExactGet: vi.fn() };
    const service = new MediaService(repository as never, storage as never, { create: () => 'collisiontokenabcdef' }, shortPolicy, { now: () => NOW });
    const result = await service.reserveUpload(actor, upload);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('CONFLICT');
  });

  it('memetakan langganan nonaktif ke forbidden', async () => {
    const { service } = harness({
      reserveMediaCandidate: async () => {
        throw new PublishingSubscriptionInactiveError('past_due');
      },
    });
    const result = await service.reserveUpload(actor, upload);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('FORBIDDEN');
  });
});

describe('MediaService completeUpload', () => {
  const reservation = {
    id: 'res-1',
    status: 'reserved',
    objectKey: 'org/foto.jpg',
    expectedMediaType: 'image/jpeg',
    expectedSizeBytes: 1_000,
    expectedChecksum: CHECKSUM,
    expiresAt: '2027-01-01T00:00:00.000Z',
  };

  it('menolak reservasi hilang lewat denial', async () => {
    const { service } = harness({ readReservation: async () => null });
    const result = await service.completeUpload(actor, { reservationId: ARTICLE });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('RESOURCE_UNAVAILABLE');
  });

  it('menolak metadata tak cocok dan menandai reject', async () => {
    const { service, repository } = harness(
      { readReservation: async () => reservation },
      { headExact: async () => ({ contentType: 'image/png', contentLength: 1_000, checksum: CHECKSUM }) },
    );
    const result = await service.completeUpload(actor, { reservationId: ARTICLE });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('INVALID_INPUT');
    expect(repository.rejectMedia).toHaveBeenCalledTimes(1);
  });

  it('mengaktifkan media saat metadata cocok', async () => {
    const { service, repository } = harness(
      { readReservation: async () => reservation },
      { headExact: async () => ({ contentType: 'image/jpeg', contentLength: 1_000, checksum: CHECKSUM }) },
    );
    const result = await service.completeUpload(actor, { reservationId: ARTICLE });
    expect(result.ok).toBe(true);
    expect(repository.activateMedia).toHaveBeenCalledTimes(1);
  });

  it('meneruskan dimensi alami ke aktivasi dan menolak pasangan timpang', async () => {
    const { service, repository } = harness(
      { readReservation: async () => reservation },
      { headExact: async () => ({ contentType: 'image/jpeg', contentLength: 1_000, checksum: CHECKSUM }) },
    );
    const activateMedia = repository.activateMedia as unknown as ReturnType<typeof vi.fn>;
    const result = await service.completeUpload(actor, { reservationId: ARTICLE, widthPx: 1200, heightPx: 675 });
    expect(result.ok).toBe(true);
    expect(activateMedia).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ widthPx: 1200, heightPx: 675 }));
    const lopsided = await service.completeUpload(actor, { reservationId: ARTICLE, widthPx: 1200 });
    expect(lopsided.ok).toBe(false);
    if (lopsided.ok) throw new Error('expected error');
    expect(lopsided.error.error.code).toBe('INVALID_INPUT');
  });
});

describe('MediaService read archive', () => {
  it('membaca list dan memetakan akses ditolak', async () => {
    const okHarness = harness();
    expect((await okHarness.service.list(actor)).ok).toBe(true);

    const deniedHarness = harness({
      listMedia: async () => {
        throw new PublishingAccessDeniedError();
      },
    });
    const denied = await deniedHarness.service.list(actor);
    expect(denied.ok).toBe(false);
    if (denied.ok) throw new Error('expected error');
    expect(denied.error.error.code).toBe('RESOURCE_UNAVAILABLE');
  });

  it('mengotorisasi baca tenant dan publik', async () => {
    const { service } = harness();
    const tenant = await service.authorizeTenantRead(actor, { mediaId: MEDIA });
    expect(tenant.ok).toBe(true);

    const broken = await service.authorizeTenantRead(actor, {});
    expect(broken.ok).toBe(false);

    const pub = await service.authorizePublicRead(
      { normalizedHostname: 'fakta01.my.id', organizationId: ORG, domainId: 'd-1', siteId: 's-1', regionId: null, routingVersion: 1 },
      MEDIA,
      'req-1',
    );
    expect(pub.ok).toBe(true);
  });

  it('mengarsipkan media dan memetakan konflik versi', async () => {
    const okHarness = harness();
    const archived = await okHarness.service.archive(actor, { mediaId: MEDIA, expectedVersion: 1 });
    expect(archived.ok).toBe(true);

    const conflictHarness = harness({
      archiveMedia: async () => {
        throw new PublishingConflictError();
      },
    });
    const conflict = await conflictHarness.service.archive(actor, { mediaId: MEDIA, expectedVersion: 1 });
    expect(conflict.ok).toBe(false);
    if (conflict.ok) throw new Error('expected error');
    expect(conflict.error.error.code).toBe('CONFLICT');
  });
});
