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
    claimReplay: vi.fn(async (input: { bodyDigest: string }) => ({ kind: 'created' as const, claim: claim(input.bodyDigest) })),
    bindReplayIdentity: vi.fn(async () => claim('x')),
    prepareReplayOutcome: vi.fn(async () => claim('x')),
    finalizeReplay: vi.fn(async () => claim('x')),
    resolveTelegramIdentity: vi.fn(async (): Promise<typeof identity | null> => identity),
    readTelegramConversation: vi.fn(async (): Promise<unknown> => null),
    saveTelegramConversation: vi.fn(async () => undefined),
    clearTelegramConversation: vi.fn(async () => undefined),
    enqueueOutboxMessage: vi.fn(async () => ({ id: 'outbox-1' })),
  };
  const listEditorial = vi.fn(async (): Promise<unknown> => ({ ok: true as const, value: { regions: [], articles: [], sites: [] } }));
  const createArticle = vi.fn(async (): Promise<unknown> => ({ ok: true as const, value: { id: 'article-9' } }));
  const assignArticleSites = vi.fn(async (): Promise<unknown> => ({ ok: true as const, value: [{ id: 'as-1' }] }));
  const publicationRequest = vi.fn(async (_actor: unknown, _input: unknown): Promise<unknown> => ({
    ok: true as const,
    value: { job: { id: 'job-1', state: 'queued' }, targets: [], result: null },
  }));
  const publicationStatus = vi.fn(async (): Promise<unknown> => ({
    ok: true as const,
    value: { job: { id: 'job-1', state: 'queued' }, targets: [], result: null },
  }));
  const listJobs = vi.fn(async (): Promise<unknown> => ({ ok: true as const, value: [] }));
  const publicationRetry = vi.fn(async (): Promise<unknown> => ({
    ok: true as const,
    value: { job: { id: 'job-1', state: 'retrying' }, targets: [], result: null },
  }));
  const sharedFactory = {
    create: () => ({
      articles: { listEditorial, createArticle, assignArticleSites },
      media: {},
      publication: { request: publicationRequest, status: publicationStatus, listJobs, retry: publicationRetry, unpublish: publicationRetry },
    }),
  };
  const mediaTransfer = { prepare: vi.fn(), transfer: vi.fn() };
  const telegram = {
    check: vi.fn(async () => ({ service: 'telegram', status: 'healthy' as const, category: 'telegram_ready' })),
    send: vi.fn(async () => undefined),
    sendPhoto: vi.fn(async () => undefined),
    answerCallback: vi.fn(async () => undefined),
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
  return { repository, service, listEditorial, createArticle, assignArticleSites, publicationRequest, publicationStatus, listJobs, publicationRetry };
}

function messageUpdate(text: string, updateId = 1) {
  return {
    update_id: updateId,
    message: { date: Math.floor(NOW.getTime() / 1_000), from: { id: 111 }, chat: { id: 111 }, text },
  };
}

function callbackUpdate(data: string, updateId = 2) {
  return {
    update_id: updateId,
    callback_query: {
      id: 'cb-1',
      from: { id: 111 },
      message: { message_id: 7, date: Math.floor(NOW.getTime() / 1_000), chat: { id: 111 } },
      data,
    },
  };
}

describe('TelegramWorkflowService discovery flows', () => {
  it('menjawab /artikel kosong dengan ajakan buat artikel', async () => {
    const { service } = harness();
    const outcome = await service.handle(SECRET, messageUpdate('/artikel', 11), 'req-artikel-empty');
    expect(outcome.result.ok).toBe(true);
    if (!outcome.result.ok) throw new Error('expected ok');
    expect(outcome.result.value.reply).toContain('Belum ada artikel');
  });

  it('menjawab /artikel berisi daftar plus keyboard aksi', async () => {
    const { service, listEditorial } = harness();
    listEditorial.mockResolvedValueOnce({
      ok: true as const,
      value: {
        regions: [],
        articles: [{ id: 'article-1', title: 'Judul Panjang Artikel Uji', status: 'draft', createdAt: '2026-09-18T13:00:00.000Z', regionId: null }],
        sites: [],
      },
    });
    const outcome = await service.handle(SECRET, messageUpdate('/artikel', 12), 'req-artikel-list');
    expect(outcome.result.ok).toBe(true);
    if (!outcome.result.ok) throw new Error('expected ok');
    expect(outcome.result.value.reply).toContain('Artikel terbaru');
    expect(outcome.result.value.display?.keyboard?.[0]?.[0]?.data).toBe('tg:a:article-1:menu');
  });

  it('menjawab /job kosong dan /job berisi', async () => {
    const empty = harness();
    const emptyOutcome = await empty.service.handle(SECRET, messageUpdate('/job', 13), 'req-job-empty');
    expect(emptyOutcome.result.ok).toBe(true);
    if (!emptyOutcome.result.ok) throw new Error('expected ok');
    expect(emptyOutcome.result.value.reply).toContain('Belum ada pekerjaan');

    const filled = harness();
    filled.listJobs.mockResolvedValueOnce({
      ok: true as const,
      value: [{ job: { id: 'job-1', state: 'queued', createdAt: '2026-09-18T13:00:00.000Z' }, articleTitle: 'Judul' }],
    });
    const filledOutcome = await filled.service.handle(SECRET, messageUpdate('/job', 14), 'req-job-list');
    expect(filledOutcome.result.ok).toBe(true);
    if (!filledOutcome.result.ok) throw new Error('expected ok');
    expect(filledOutcome.result.value.reply).toContain('Pekerjaan terbaru');
    expect(filledOutcome.result.value.display?.keyboard?.[0]?.[0]?.data).toBe('tg:j:job-1:menu');
  });

  it('menjawab /portal dengan daftar portal aktif', async () => {
    const { service, listEditorial } = harness();
    listEditorial.mockResolvedValueOnce({
      ok: true as const,
      value: {
        regions: [{ id: 'region-1', name: 'Jawa' }],
        articles: [],
        sites: [{ id: 'site-1', status: 'active', normalizedHostname: 'fakta01.my.id', regionId: null }],
      },
    });
    const outcome = await service.handle(SECRET, messageUpdate('/portal', 15), 'req-portal');
    expect(outcome.result.ok).toBe(true);
    if (!outcome.result.ok) throw new Error('expected ok');
    expect(outcome.result.value.reply).toContain('fakta01.my.id');
  });

  it('membuat idempotency key otomatis saat /publish tanpa KEY', async () => {
    const { service, publicationRequest } = harness();
    const outcome = await service.handle(SECRET, messageUpdate('/publish article-1 site-1', 16), 'req-publish-auto');
    expect(outcome.result.ok).toBe(true);
    expect(publicationRequest).toHaveBeenCalledTimes(1);
    const sent = publicationRequest.mock.calls[0]?.[1] as unknown as { idempotencyKey: string };
    expect(sent.idempotencyKey.startsWith('tg-')).toBe(true);
  });

  it('membuka picker portal dari callback artikel dan menyimpan sesi', async () => {
    const { service, repository, listEditorial } = harness();
    listEditorial.mockResolvedValue({
      ok: true as const,
      value: {
        regions: [],
        articles: [{ id: 'article-1', title: 'Judul', status: 'draft', createdAt: '2026-09-18T13:00:00.000Z', regionId: null }],
        sites: [{ id: 'site-1', status: 'active', normalizedHostname: 'fakta01.my.id', regionId: null }],
      },
    });
    const outcome = await service.handle(SECRET, callbackUpdate('tg:a:article-1:pub', 17), 'req-pick');
    expect(outcome.result.ok).toBe(true);
    if (!outcome.result.ok) throw new Error('expected ok');
    expect(outcome.result.value.reply).toContain('Pilih portal');
    expect(outcome.result.value.display?.keyboard?.[0]?.[0]?.data).toBe('tg:ps:site-1');
    expect(repository.saveTelegramConversation).toHaveBeenCalled();
  });

  it('menerbitkan situs terpilih dan menutup sesi picker', async () => {
    const { service, repository, publicationRequest } = harness();
    repository.readTelegramConversation.mockResolvedValueOnce({
      step: 'publish_pick_site',
      data: { articleId: 'article-1' },
    });
    const outcome = await service.handle(SECRET, callbackUpdate('tg:ps:site-1', 18), 'req-picked');
    expect(outcome.result.ok).toBe(true);
    expect(publicationRequest).toHaveBeenCalled();
    expect(repository.clearTelegramConversation).toHaveBeenCalled();
  });

  it('menolak situs terpilih saat sesi kedaluwarsa', async () => {
    const { service, repository } = harness();
    repository.readTelegramConversation.mockResolvedValueOnce(null);
    const outcome = await service.handle(SECRET, callbackUpdate('tg:ps:site-1', 19), 'req-picked-expired');
    expect(outcome.result.ok).toBe(true);
    if (!outcome.result.ok) throw new Error('expected ok');
    expect(outcome.result.value.reply).toContain('kedaluwarsa');
  });

  it('membuka menu job dan menjalankan aksi retry dari callback', async () => {
    const picker = harness();
    const menuOutcome = await picker.service.handle(SECRET, callbackUpdate('tg:j:job-1:menu', 20), 'req-job-menu');
    expect(menuOutcome.result.ok).toBe(true);
    if (!menuOutcome.result.ok) throw new Error('expected ok');
    expect(menuOutcome.result.value.reply).toContain('Job: job-1');

    const retryer = harness();
    const retryOutcome = await retryer.service.handle(SECRET, callbackUpdate('tg:j:job-1:retry', 21), 'req-job-retry');
    expect(retryOutcome.result.ok).toBe(true);
    if (!retryOutcome.result.ok) throw new Error('expected ok');
    expect(retryOutcome.result.value.reply).toContain('Pengulangan antre');
    expect(retryer.publicationRetry).toHaveBeenCalled();
  });
});

function conversationOf(step: string, data: Record<string, unknown> = {}) {
  return {
    source: 'telegram',
    chatId: '111',
    userId: '111',
    organizationId: 'org-1',
    step,
    data,
    updatedAt: NOW.toISOString(),
    expiresAt: new Date(NOW.getTime() + 3_600_000).toISOString(),
  };
}

describe('TelegramWorkflowService article wizard', () => {
  it('memulai wizard /article dari region hingga slug', async () => {
    const { service, repository, createArticle } = harness();
    const started = await service.handle(SECRET, messageUpdate('/article', 30), 'req-wizard-start');
    expect(started.result.ok).toBe(true);
    if (!started.result.ok) throw new Error('expected ok');
    expect(started.result.value.reply).toContain('ID Region');

    const steps: Array<[string, Record<string, unknown>, string]> = [
      ['article_region', {}, 'judul'],
      ['article_title', { regionId: 'region-1' }, 'isi'],
      ['article_body', { regionId: 'region-1', title: 'Judul' }, 'atribusi'],
      ['article_source', { regionId: 'region-1', title: 'Judul', body: 'Isi' }, 'slug'],
    ];
    for (const [index, [step, data, hint]] of steps.entries()) {
      repository.readTelegramConversation.mockResolvedValueOnce(conversationOf(step, data));
      const outcome = await service.handle(SECRET, messageUpdate(`jawaban-${index}`, 31 + index), `req-wizard-${index}`);
      expect(outcome.result.ok).toBe(true);
      if (!outcome.result.ok) throw new Error('expected ok');
      expect(outcome.result.value.reply.toLowerCase()).toContain(hint);
    }

    repository.readTelegramConversation.mockResolvedValueOnce(
      conversationOf('article_slug', { regionId: 'region-1', title: 'Judul', body: 'Isi', source: 'Humas' }),
    );
    const done = await service.handle(SECRET, messageUpdate('judul-artikel', 35), 'req-wizard-done');
    expect(done.result.ok).toBe(true);
    if (!done.result.ok) throw new Error('expected ok');
    expect(done.result.value.reply).toContain('article-9');
    expect(createArticle).toHaveBeenCalledTimes(1);
    expect(repository.clearTelegramConversation).toHaveBeenCalled();
  });

  it('membatalkan percakapan dan membersihkan sesi', async () => {
    const { service, repository } = harness();
    const outcome = await service.handle(SECRET, messageUpdate('/cancel', 36), 'req-cancel');
    expect(outcome.result.ok).toBe(true);
    if (!outcome.result.ok) throw new Error('expected ok');
    expect(outcome.result.value.reply).toContain('dibatalkan');
    expect(repository.clearTelegramConversation).toHaveBeenCalled();
  });

  it('jatuh ke bantuan untuk perintah tak dikenal tanpa sesi', async () => {
    const { service } = harness();
    const outcome = await service.handle(SECRET, messageUpdate('halo bot', 37), 'req-unknown');
    expect(outcome.result.ok).toBe(true);
    if (!outcome.result.ok) throw new Error('expected ok');
    expect(outcome.result.value.reply).toContain('tidak dikenali');
  });

  it('mereset sesi kedaluwarsa', async () => {
    const { service, repository } = harness();
    repository.readTelegramConversation.mockResolvedValueOnce({
      ...conversationOf('article_title', {}),
      expiresAt: new Date(NOW.getTime() - 1_000).toISOString(),
    });
    const outcome = await service.handle(SECRET, messageUpdate('teks basi', 38), 'req-expired');
    expect(outcome.result.ok).toBe(true);
    if (!outcome.result.ok) throw new Error('expected ok');
    expect(outcome.result.value.reply).toContain('tidak dikenali');
  });
});

describe('TelegramWorkflowService sites assignment', () => {
  const editorial = {
    ok: true as const,
    value: {
      regions: [{ id: 'region-1', name: 'Jawa' }],
      articles: [{ id: 'article-1', regionId: 'region-1' }],
      sites: [
        { id: 'site-1', status: 'active', normalizedHostname: 'portal.example', regionId: null },
        { id: 'site-2', status: 'inactive', normalizedHostname: 'mati.example', regionId: null },
      ],
    },
  };

  it('menampilkan portal aktif untuk /sites', async () => {
    const { service, listEditorial } = harness();
    listEditorial.mockResolvedValue(editorial);
    const outcome = await service.handle(SECRET, messageUpdate('/sites article-1', 40), 'req-sites');
    expect(outcome.result.ok).toBe(true);
    if (!outcome.result.ok) throw new Error('expected ok');
    expect(outcome.result.value.reply).toContain('portal.example');
    expect(outcome.result.value.reply).not.toContain('mati.example');
  });

  it('menautkan portal terpilih dan menutup sesi', async () => {
    const { service, repository, assignArticleSites } = harness();
    repository.readTelegramConversation.mockResolvedValueOnce(
      conversationOf('article_sites', { articleId: 'article-1', availableSiteIds: ['site-1'] }),
    );
    const outcome = await service.handle(SECRET, messageUpdate('site-1', 41), 'req-assign');
    expect(outcome.result.ok).toBe(true);
    if (!outcome.result.ok) throw new Error('expected ok');
    expect(outcome.result.value.reply).toContain('1 portal');
    expect(assignArticleSites).toHaveBeenCalledTimes(1);
    expect(repository.clearTelegramConversation).toHaveBeenCalled();
  });

  it('menolak site di luar daftar dengan invalid input', async () => {
    const { service, repository } = harness();
    repository.readTelegramConversation.mockResolvedValueOnce(
      conversationOf('article_sites', { articleId: 'article-1', availableSiteIds: ['site-1'] }),
    );
    const outcome = await service.handle(SECRET, messageUpdate('site-asing', 42), 'req-assign-bad');
    expect(outcome.result.ok).toBe(false);
    if (outcome.result.ok) throw new Error('expected error');
    expect(outcome.result.error.error.code).toBe('INVALID_INPUT');
  });

  it('meminta foto saat /image tanpa dokumen', async () => {
    const { service, repository } = harness();
    repository.readTelegramConversation.mockResolvedValueOnce(conversationOf('article_image', { articleId: 'article-1' }));
    const outcome = await service.handle(SECRET, messageUpdate('bukan foto', 43), 'req-image-text');
    expect(outcome.result.ok).toBe(true);
    if (!outcome.result.ok) throw new Error('expected ok');
    expect(outcome.result.value.reply).toContain('Kirim foto');
  });
});
