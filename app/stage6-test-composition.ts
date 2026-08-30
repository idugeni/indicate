import { TenantBusinessService } from '@/application/stage3/tenant-business-service';
import { MediaService } from '@/application/stage4/media-service';
import { PublicationService } from '@/application/stage4/publication-service';
import type { TelegramSharedServiceFactory } from '@/application/stage6/telegram-workflow-service';
import { ALPHA_ORGANIZATION_ID, getStage3E2eRepositoryFixture, STAGE3_USER_ID } from '@/infrastructure/testing/stage3-fixture';
import { getStage4E2eFixture } from '@/infrastructure/testing/stage4-fixture';
import { InMemoryStage6Repository } from '@/infrastructure/testing/stage6-memory';
import { UuidGenerator } from '@/infrastructure/system/uuid-generator';
import type { TelegramPort } from '@/ports/telegram';
import type { TelegramMediaTransferPort } from '@/ports/telegram-media';

export const TELEGRAM_USER_ID = '600001';
export const TELEGRAM_CHAT_ID = '600002';

export class InMemoryTelegramAdapter implements TelegramPort, TelegramMediaTransferPort {
  readonly messages: { chatId: string; text: string }[] = [];
  async check() { return { service: 'memory-telegram', status: 'healthy' as const }; }
  async send(message: { readonly chatId: string; readonly text: string }): Promise<void> { this.messages.push({ ...message }); }
  async prepare(input: { readonly expectedSize: number }) {
    const bytes = new ArrayBuffer(input.expectedSize);
    const checksumSha256 = Buffer.from(await crypto.subtle.digest('SHA-256', bytes)).toString('base64');
    return { bytes, sizeBytes: input.expectedSize, checksumSha256 };
  }
  async transfer(input: { readonly media: { readonly sizeBytes: number; readonly checksumSha256: string }; readonly authorization: { readonly key: string }; readonly mediaType: string }): Promise<void> {
    getStage4E2eFixture().storage.putObject({ key: input.authorization.key, contentType: input.mediaType, contentLength: input.media.sizeBytes, checksum: input.media.checksumSha256 });
  }
}

export function createStage6Fixture() {
  const repository = new InMemoryStage6Repository(); const telegram = new InMemoryTelegramAdapter();
  const stage3 = getStage3E2eRepositoryFixture(); const stage4 = getStage4E2eFixture(); const identifiers = new UuidGenerator();
  const permissions = stage3.repository.snapshot(ALPHA_ORGANIZATION_ID)?.roles[0]?.permissions ?? new Set<string>();
  repository.seedTelegram({ mappingId: '00000000-0000-4000-8000-000000006010', organizationId: ALPHA_ORGANIZATION_ID, userId: STAGE3_USER_ID, roleId: '00000000-0000-4000-8000-000000000020', telegramUserId: TELEGRAM_USER_ID, telegramChatId: TELEGRAM_CHAT_ID, permissions });
  repository.seedCustomer({ customer: { id: ALPHA_ORGANIZATION_ID, name: 'Organization Alpha', slug: 'organization-alpha', status: 'active', customerMetadata: {}, version: 1, createdAt: '2026-08-30T00:00:00.000Z', updatedAt: '2026-08-30T00:00:00.000Z' }, subscription: { organizationId: ALPHA_ORGANIZATION_ID, plan: 'mvp', status: 'active', periodStartsAt: null, periodEndsAt: null, version: 1, createdAt: '2026-08-30T00:00:00.000Z', updatedAt: '2026-08-30T00:00:00.000Z' } });
  const sharedFactory: TelegramSharedServiceFactory = { create: () => ({
    articles: new TenantBusinessService(stage3.repository, identifiers),
    media: new MediaService(stage4.repository, stage4.storage, identifiers, { maxBytes: 10_485_760, allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'], uploadTtlSeconds: 600, readTtlSeconds: 300 }),
    publication: new PublicationService(stage4.repository, stage4.queue, identifiers, { maxAttempts: 5, delaysSeconds: [1, 2, 4, 8] }),
  }) };
  return { repository, telegram, sharedFactory };
}

const globalFixture = globalThis as typeof globalThis & { __indicateStage6Fixture?: ReturnType<typeof createStage6Fixture> };
export function getStage6E2eFixture() { globalFixture.__indicateStage6Fixture ??= createStage6Fixture(); return globalFixture.__indicateStage6Fixture; }
