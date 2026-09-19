import { describe, expect, it, vi } from 'vitest';

import { TelegramWorkflowService } from '@/modules/integrations/telegram-workflow-service';

const NOW = new Date('2026-09-18T14:00:00.000Z');
const SECRET = 'test-webhook-secret';
const PHOTO = 'https://example.test/brand/welcome.png';

const identity = {
  mappingId: 'mapping-1',
  organizationId: 'org-1',
  userId: 'user-1',
  roleId: 'role-1',
  telegramUserId: '111',
  telegramChatId: '111',
  regionId: null,
  permissions: new Set<string>(),
};

function claim(bodyDigest: string) {
  return {
    source: 'telegram',
    replayId: '1',
    organizationId: null,
    bodyDigest,
    identityBindingDigest: null,
    claimToken: 'token-1',
    businessReceipt: null,
    status: 'claimed' as const,
    pendingStatus: null,
    outcome: null,
    receivedAt: NOW.toISOString(),
    leaseExpiresAt: NOW.toISOString(),
    attemptCount: 1,
    expiresAt: NOW.toISOString(),
  };
}

function harness() {
  const repository = {
    claimReplay: vi.fn(async (input: { bodyDigest: string }): Promise<unknown> => ({ kind: 'created' as const, claim: claim(input.bodyDigest) })),
    bindReplayIdentity: vi.fn(async () => claim('x')),
    prepareReplayOutcome: vi.fn(async () => claim('x')),
    finalizeReplay: vi.fn(async () => claim('x')),
    resolveTelegramIdentity: vi.fn(async (): Promise<typeof identity | null> => identity),
    listTelegramIdentities: vi.fn(async (): Promise<unknown[]> => []),
    readTelegramConversation: vi.fn(async (): Promise<unknown> => null),
    saveTelegramConversation: vi.fn(async () => undefined),
    clearTelegramConversation: vi.fn(async () => undefined),
    enqueueOutboxMessage: vi.fn(async () => ({ id: 'outbox-1' })),
  };
  const sharedFactory = { create: () => ({ articles: {}, media: {}, publication: {} }) };
  const mediaTransfer = { prepare: vi.fn(), transfer: vi.fn() };
  const telegram = {
    check: vi.fn(async () => ({ service: 'telegram', status: 'healthy' as const, category: 'telegram_ready' })),
    send: vi.fn(async (): Promise<unknown> => undefined),
    sendPhoto: vi.fn(async (): Promise<unknown> => undefined),
    answerCallback: vi.fn(async () => undefined),
    editMessage: vi.fn(async () => undefined),
    deleteMessage: vi.fn(async () => undefined),
    setMyCommands: vi.fn(async () => undefined),
  };
  const service = new TelegramWorkflowService(
    repository as never,
    sharedFactory as never,
    mediaTransfer as never,
    telegram as never,
    SECRET,
    900,
    3600,
    PHOTO,
    { now: () => NOW },
  );
  return { repository, telegram, service };
}

function messageUpdate(text: string, updateId = 1) {
  return {
    update_id: updateId,
    message: { date: Math.floor(NOW.getTime() / 1_000), from: { id: 111 }, chat: { id: 111 }, text },
  };
}

describe('TelegramWorkflowService retired flows', () => {
  it('menjawab /start tanpa perlu identitas organisasi', async () => {
    const { service, repository } = harness();
    repository.resolveTelegramIdentity.mockResolvedValueOnce(null);
    const outcome = await service.handle(SECRET, messageUpdate('/start', 11), 'req-entry-anon');

    expect(outcome.result.ok).toBe(true);
    if (!outcome.result.ok) throw new Error('expected ok');
    expect(outcome.result.value.reply).toContain('Mini App');
  });

  it('menghentikan tautan lewat /stop walau tanpa identitas', async () => {
    const { service, repository } = harness();
    repository.resolveTelegramIdentity.mockResolvedValueOnce(null);
    const outcome = await service.handle(SECRET, messageUpdate('/stop', 12), 'req-stop-anon');

    expect(outcome.result.ok).toBe(true);
    expect(repository.clearTelegramConversation).not.toHaveBeenCalled();
  });

  it('mengarahkan perintah pensiun apa pun ke pintu Mini App', async () => {
    const { service } = harness();
    for (const [index, text] of ['/article', '/publish', '/status', '/artikel', '/cari banjir'].entries()) {
      const outcome = await service.handle(SECRET, messageUpdate(text, 20 + index), `req-retired-${index}`);
      expect(outcome.result.ok).toBe(true);
      if (!outcome.result.ok) throw new Error('expected ok');
      expect(outcome.result.value.reply).toContain('Mini App');
    }
  });

  it('merekam outcome sekali lalu memutarnya untuk duplikat', async () => {
    const { service, repository } = harness();
    const raw = messageUpdate('/start', 30);
    const first = await service.handle(SECRET, raw, 'req-dup-first');
    expect(first.result.ok).toBe(true);
    expect(repository.prepareReplayOutcome).toHaveBeenCalledTimes(1);

    repository.claimReplay.mockImplementationOnce(async (input: { bodyDigest: string }) => ({
      kind: 'duplicate' as const,
      claim: { ...claim(input.bodyDigest), status: 'processed' as const, outcome: { reply: 'Mini App entry' } },
    }));
    const second = await service.handle(SECRET, raw, 'req-dup-second');
    expect(second.result.ok).toBe(true);
    if (!second.result.ok) throw new Error('expected ok');
    expect(second.result.value.reply).toContain('Mini App');
    expect(repository.prepareReplayOutcome).toHaveBeenCalledTimes(1);
  });
});
