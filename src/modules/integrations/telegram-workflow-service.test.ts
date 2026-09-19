import { describe, expect, it, vi } from 'vitest';

import { TELEGRAM_BOT_COMMANDS, TelegramWorkflowService } from '@/modules/integrations/telegram-workflow-service';

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
    claimReplay: vi.fn(async (input: { bodyDigest: string }) => ({ kind: 'created' as const, claim: claim(input.bodyDigest) })),
    bindReplayIdentity: vi.fn(async () => claim('x')),
    prepareReplayOutcome: vi.fn(async () => claim('x')),
    finalizeReplay: vi.fn(async () => claim('x')),
    resolveTelegramIdentity: vi.fn(async (): Promise<typeof identity | null> => identity),
    listTelegramIdentities: vi.fn(async (): Promise<unknown[]> => []),
    readTelegramConversation: vi.fn(async () => null),
    saveTelegramConversation: vi.fn(async () => undefined),
    clearTelegramConversation: vi.fn(async () => undefined),
    enqueueOutboxMessage: vi.fn(async () => ({ id: 'outbox-1' })),
  };
  const telegram = {
    check: vi.fn(async () => ({ service: 'telegram', status: 'healthy' as const, category: 'telegram_ready' })),
    send: vi.fn(async () => undefined),
    sendPhoto: vi.fn(async () => undefined),
    answerCallback: vi.fn(async () => undefined),
    editMessage: vi.fn(async () => undefined),
    setMyCommands: vi.fn(async () => undefined),
  };
  const sharedFactory = {
    create: () => ({
      articles: { listEditorial: vi.fn(async () => ({ ok: true as const, value: { regions: [{ id: 'region-1', name: 'Jawa', status: 'active' }], articles: [], sites: [] } })) },
      media: {},
      publication: { listJobs: vi.fn(async () => ({ ok: true as const, value: [] })) },
    }),
  };
  const mediaTransfer = { prepare: vi.fn(), transfer: vi.fn() };
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

describe('TelegramWorkflowService welcome desk', () => {
  it('answers /start with a photo, caption, and menu keyboard', async () => {
    const { service, telegram } = harness();
    const raw = messageUpdate('/start');
    const outcome = await service.handle(SECRET, raw, 'req-1');

    expect(outcome.result.ok).toBe(true);
    const photo = outcome.pendingReplies.find((reply) => reply.kind === 'photo');
    expect(photo).toMatchObject({ chatId: '111', photoUrl: PHOTO });
    if (photo?.kind !== 'photo') throw new Error('welcome photo missing');
    expect(photo.caption).toContain('Selamat datang di Bot Resmi Indicate');
    expect(photo.keyboard).toHaveLength(6);

    await service.deliverReplies(outcome.pendingReplies, 'req-1');
    expect(telegram.sendPhoto).toHaveBeenCalledTimes(1);
    expect(telegram.send).not.toHaveBeenCalled();
  });

  it('routes menu button taps to the matching command flow', async () => {
    const { repository, telegram, service } = harness();
    const raw = {
      update_id: 2,
      callback_query: {
        id: 'cb-1',
        from: { id: 111 },
        message: { message_id: 7, date: Math.floor(NOW.getTime() / 1_000), chat: { id: 111 } },
        data: 'tg:article',
      },
    };
    const outcome = await service.handle(SECRET, raw, 'req-2');

    expect(outcome.result.ok).toBe(true);
    expect(outcome.pendingReplies[0]).toMatchObject({ kind: 'callback-answer', callbackId: 'cb-1' });
    expect(repository.saveTelegramConversation).toHaveBeenCalledTimes(1);

    await service.deliverReplies(outcome.pendingReplies, 'req-2');
    expect(telegram.answerCallback).toHaveBeenCalledWith({ callbackId: 'cb-1' });
  });

  it('explains linking professionally to unknown senders', async () => {
    const { service, repository } = harness();
    repository.resolveTelegramIdentity.mockResolvedValueOnce(null);
    const outcome = await service.handle(SECRET, messageUpdate('/start', 3), 'req-3');

    expect(outcome.result.ok).toBe(false);
    expect(outcome.pendingReplies).toHaveLength(1);
    expect(outcome.pendingReplies[0]).toMatchObject({ kind: 'text' });
    if (outcome.pendingReplies[0]?.kind !== 'text') throw new Error('expected text denial');
    expect(outcome.pendingReplies[0].text).toContain('belum tertaut');
  });

  it('opens a job picker for bare /status instead of failing silently', async () => {
    const { service } = harness();
    const outcome = await service.handle(SECRET, messageUpdate('/status', 4), 'req-4');

    expect(outcome.result.ok).toBe(true);
    if (!outcome.result.ok) throw new Error('expected ok');
    expect(outcome.result.value.reply).toContain('Belum ada pekerjaan publikasi');
  });

  it('falls back to caption text when the welcome photo fails', async () => {
    const { service, repository, telegram } = harness();
    telegram.sendPhoto.mockRejectedValueOnce(new Error('fetch failed'));
    const outcome = await service.handle(SECRET, messageUpdate('/start', 5), 'req-5');

    await service.deliverReplies(outcome.pendingReplies, 'req-5');
    expect(telegram.send).toHaveBeenCalledTimes(1);
    expect(repository.enqueueOutboxMessage).not.toHaveBeenCalled();
  });

  it('queues caption text when both photo and text delivery fail', async () => {
    const { service, repository, telegram } = harness();
    telegram.sendPhoto.mockRejectedValueOnce(new Error('fetch failed'));
    telegram.send.mockRejectedValueOnce(new Error('send failed'));
    const outcome = await service.handle(SECRET, messageUpdate('/start', 6), 'req-6');

    await service.deliverReplies(outcome.pendingReplies, 'req-6');
    expect(repository.enqueueOutboxMessage).toHaveBeenCalledTimes(1);
  });
});

describe('TelegramWorkflowService bot menu', () => {
  it('mendorong menu perintah kanonis yang valid ke Bot API', async () => {
    const { service, telegram } = harness();
    await service.syncBotCommands();
    expect(telegram.setMyCommands).toHaveBeenCalledTimes(1);
    expect(telegram.setMyCommands).toHaveBeenCalledWith(TELEGRAM_BOT_COMMANDS);
    const seen = new Set<string>();
    for (const { command, description } of TELEGRAM_BOT_COMMANDS) {
      expect(command).toMatch(/^[a-z0-9_]{1,32}$/);
      expect(description.length).toBeGreaterThan(0);
      expect(description.length).toBeLessThanOrEqual(256);
      expect(seen.has(command)).toBe(false);
      seen.add(command);
    }
  });
});
