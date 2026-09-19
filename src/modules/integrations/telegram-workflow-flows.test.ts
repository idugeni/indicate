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
    listTelegramIdentities: vi.fn(async (): Promise<unknown[]> => []),
    readTelegramConversation: vi.fn(async (): Promise<unknown> => null),
    saveTelegramConversation: vi.fn(async () => undefined),
    clearTelegramConversation: vi.fn(async () => undefined),
    enqueueOutboxMessage: vi.fn(async () => ({ id: 'outbox-1' })),
  };
  const listEditorial = vi.fn(async (): Promise<unknown> => ({ ok: true as const, value: { regions: [], articles: [], sites: [] } }));
  const createArticle = vi.fn(async (): Promise<unknown> => ({ ok: true as const, value: { id: 'article-9' } }));
  const updateArticle = vi.fn(async (_actor: unknown, _input: unknown): Promise<unknown> => ({ ok: true as const, value: { id: 'article-1' } }));
  const archiveArticle = vi.fn(async (_actor: unknown, _input: unknown): Promise<unknown> => ({ ok: true as const, value: { id: 'article-1', status: 'archived' } }));
  const restoreArticle = vi.fn(async (_actor: unknown, _input: unknown): Promise<unknown> => ({ ok: true as const, value: { id: 'article-1', status: 'draft' } }));
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
  const publicationSuggest = vi.fn(async (): Promise<unknown> => ({
    ok: true as const,
    value: { articleId: 'article-1', overrides: { 'site-1': { title: 'Judul Unik', description: 'Deskripsi unik' } } },
  }));
  const sharedFactory = {
    create: () => ({
      articles: { listEditorial, createArticle, updateArticle, archiveArticle, restoreArticle, assignArticleSites },
      media: {},
      publication: { request: publicationRequest, status: publicationStatus, listJobs, retry: publicationRetry, unpublish: publicationRetry, suggest: publicationSuggest },
    }),
  };
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
  return { repository, telegram, service, listEditorial, createArticle, updateArticle, archiveArticle, restoreArticle, assignArticleSites, publicationRequest, publicationStatus, listJobs, publicationRetry, publicationSuggest };
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
    expect(outcome.result.value.display?.keyboard?.[0]?.[0]?.data).toBe('tg:p:site-1:menu');
  });

  it('membuka menu detail portal dari callback', async () => {
    const { service, listEditorial } = harness();
    listEditorial.mockResolvedValueOnce({
      ok: true as const,
      value: {
        regions: [],
        articles: [],
        sites: [{ id: 'site-1', status: 'active', normalizedHostname: 'fakta01.my.id', regionId: null }],
      },
    });
    const outcome = await service.handle(SECRET, callbackUpdate('tg:p:site-1:menu', 16), 'req-portal-menu');
    expect(outcome.result.ok).toBe(true);
    if (!outcome.result.ok) throw new Error('expected ok');
    expect(outcome.result.value.reply).toContain('fakta01.my.id');
    expect(outcome.result.value.reply).toContain('Status: active');
  });

  it('mencari artikel lewat /cari dan menangani kata kosong', async () => {
    const empty = harness();
    const usage = await empty.service.handle(SECRET, messageUpdate('/cari', 17), 'req-cari-usage');
    expect(usage.result.ok).toBe(true);
    if (!usage.result.ok) throw new Error('expected ok');
    expect(usage.result.value.reply).toContain('kata kunci');

    const filled = harness();
    filled.listEditorial.mockResolvedValueOnce({
      ok: true as const,
      value: {
        regions: [],
        articles: [{ id: 'article-1', title: 'Banjir Melanda Kota', status: 'draft', createdAt: '2026-09-18T13:00:00.000Z', regionId: null }],
        sites: [],
      },
    });
    const hit = await filled.service.handle(SECRET, messageUpdate('/cari banjir', 18), 'req-cari-hit');
    expect(hit.result.ok).toBe(true);
    if (!hit.result.ok) throw new Error('expected ok');
    expect(hit.result.value.reply).toContain('Banjir Melanda Kota');
    expect(hit.result.value.display?.keyboard?.[0]?.[0]?.data).toBe('tg:a:article-1:menu');

    const miss = harness();
    miss.listEditorial.mockResolvedValueOnce({ ok: true as const, value: { regions: [], articles: [], sites: [] } });
    const missOutcome = await miss.service.handle(SECRET, messageUpdate('/cari zilch', 19), 'req-cari-miss');
    expect(missOutcome.result.ok).toBe(true);
    if (!missOutcome.result.ok) throw new Error('expected ok');
    expect(missOutcome.result.value.reply).toContain('Tidak ada artikel yang cocok');
  });

  it('menyusun saran varian lewat centang tombol', async () => {
    const { service, repository, publicationSuggest } = harness();
    repository.readTelegramConversation.mockResolvedValueOnce(
      conversationOf('site_pick', { articleId: 'article-1', mode: 'suggest', selected: ['site-1'], availableSiteIds: ['site-1'] }),
    );
    const outcome = await service.handle(SECRET, callbackUpdate('tg:ts:go', 20), 'req-suggest');
    expect(outcome.result.ok).toBe(true);
    if (!outcome.result.ok) throw new Error('expected ok');
    expect(publicationSuggest).toHaveBeenCalledTimes(1);
    expect(outcome.result.value.reply).toContain('Judul Unik');
    expect(outcome.result.value.reply).toContain('Deskripsi unik');
    expect(repository.clearTelegramConversation).toHaveBeenCalled();
  });

  it('memandu alur saran dari tombol artikel', async () => {
    const { service, repository, listEditorial } = harness();
    listEditorial.mockResolvedValue({
      ok: true as const,
      value: {
        regions: [],
        articles: [{ id: 'article-1', title: 'Judul', status: 'draft', createdAt: '2026-09-18T13:00:00.000Z', regionId: null }],
        sites: [{ id: 'site-1', status: 'active', normalizedHostname: 'situs.example', regionId: null }],
      },
    });
    const start = await service.handle(SECRET, callbackUpdate('tg:a:article-1:sug', 21), 'req-suggest-start');
    expect(start.result.ok).toBe(true);
    if (!start.result.ok) throw new Error('expected ok');
    expect(start.result.value.reply).toContain('menyusun saran');
    expect(start.result.value.display?.keyboard?.[0]?.[0]?.data).toBe('tg:ts:site-1');
    expect(repository.saveTelegramConversation).toHaveBeenCalledTimes(1);
  });

  it('perintah berargumen ID dialihkan ke pemilih tombol', async () => {
    const typed = harness();
    typed.listEditorial.mockResolvedValue({
      ok: true as const,
      value: {
        regions: [],
        articles: [{ id: 'article-1', title: 'Judul', status: 'draft', createdAt: '2026-09-18T13:00:00.000Z', regionId: null }],
        sites: [],
      },
    });
    const outcome = await typed.service.handle(SECRET, messageUpdate('/publish article-1 site-1', 16), 'req-publish-auto');
    expect(outcome.result.ok).toBe(true);
    if (!outcome.result.ok) throw new Error('expected ok');
    expect(outcome.result.value.reply).toContain('Pilih artikel');
    expect(outcome.result.value.display?.keyboard?.[0]?.[0]?.data).toBe('tg:a:article-1:pub');
    expect(typed.publicationRequest).not.toHaveBeenCalled();

    const status = harness();
    status.listJobs.mockResolvedValueOnce({
      ok: true as const,
      value: [{ job: { id: 'job-1', state: 'queued', createdAt: '2026-09-18T13:00:00.000Z' }, articleTitle: 'Judul' }],
    });
    const statusOutcome = await status.service.handle(SECRET, messageUpdate('/status job-1', 17), 'req-status-typed');
    expect(statusOutcome.result.ok).toBe(true);
    if (!statusOutcome.result.ok) throw new Error('expected ok');
    expect(statusOutcome.result.value.reply).toContain('Pilih pekerjaan');
    expect(statusOutcome.result.value.display?.keyboard?.[0]?.[0]?.data).toBe('tg:j:job-1:menu');
    expect(status.publicationStatus).not.toHaveBeenCalled();
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
    expect(outcome.result.value.reply).toContain('Pilih situs');
    expect(outcome.result.value.display?.keyboard?.[0]?.[0]?.data).toBe('tg:ps:all');
    expect(outcome.result.value.display?.keyboard?.[1]?.[0]?.data).toBe('tg:ps:site-1');
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
    expect(menuOutcome.result.value.reply).toContain('Status: queued');
    expect(menuOutcome.result.value.reply).not.toContain('job-1');

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
    const { service, repository, listEditorial, createArticle } = harness();
    listEditorial.mockResolvedValueOnce({
      ok: true as const,
      value: { regions: [{ id: 'region-1', name: 'Jawa', status: 'active' }], articles: [], sites: [] },
    });
    const started = await service.handle(SECRET, messageUpdate('/article', 30), 'req-wizard-start');
    expect(started.result.ok).toBe(true);
    if (!started.result.ok) throw new Error('expected ok');
    expect(started.result.value.reply).toContain('Pilih region');

    repository.readTelegramConversation.mockResolvedValueOnce(conversationOf('article_region', {}));
    listEditorial.mockResolvedValueOnce({
      ok: true as const,
      value: { regions: [{ id: 'region-1', name: 'Jawa', status: 'active' }], articles: [], sites: [] },
    });
    const picked = await service.handle(SECRET, callbackUpdate('tg:rg:region-1', 31), 'req-wizard-region');
    expect(picked.result.ok).toBe(true);
    if (!picked.result.ok) throw new Error('expected ok');
    expect(picked.result.value.reply).toContain('judul');

    const steps: Array<[string, Record<string, unknown>, string]> = [
      ['article_title', { regionId: 'region-1' }, 'isi'],
      ['article_body', { regionId: 'region-1', title: 'Judul' }, 'atribusi'],
      ['article_source', { regionId: 'region-1', title: 'Judul', body: 'Isi' }, 'slug'],
    ];
    for (const [index, [step, data, hint]] of steps.entries()) {
      repository.readTelegramConversation.mockResolvedValueOnce(conversationOf(step, data));
      const outcome = await service.handle(SECRET, messageUpdate(`jawaban-${index}`, 32 + index), `req-wizard-${index}`);
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
    expect(done.result.value.reply).toContain('Artikel berhasil dibuat');
    expect(done.result.value.display?.keyboard?.[0]?.[0]?.data).toBe('tg:a:article-9:puball');
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
      articles: [{ id: 'article-1', title: 'Judul', status: 'draft', createdAt: '2026-09-18T13:00:00.000Z', regionId: 'region-1' }],
      sites: [
        { id: 'site-1', status: 'active', normalizedHostname: 'situs.example', regionId: null },
        { id: 'site-2', status: 'inactive', normalizedHostname: 'mati.example', regionId: null },
      ],
    },
  };

  it('mengalihkan /sites berargumen ke pemilih artikel', async () => {
    const { service, listEditorial } = harness();
    listEditorial.mockResolvedValue(editorial);
    const outcome = await service.handle(SECRET, messageUpdate('/sites article-1', 40), 'req-sites');
    expect(outcome.result.ok).toBe(true);
    if (!outcome.result.ok) throw new Error('expected ok');
    expect(outcome.result.value.reply).toContain('Pilih artikel untuk diatur situsnya');
    expect(outcome.result.value.display?.keyboard?.[0]?.[0]?.data).toBe('tg:a:article-1:sites');
  });

  it('mencentang portal lewat tombol lalu menerbitkan pilihan', async () => {
    const { service, repository, listEditorial, publicationRequest } = harness();
    listEditorial.mockResolvedValue({
      ok: true as const,
      value: {
        regions: [],
        articles: [{ id: 'article-1', title: 'Judul', status: 'draft', createdAt: '2026-09-18T13:00:00.000Z', regionId: null }],
        sites: [{ id: 'site-1', status: 'active', normalizedHostname: 'situs.example', regionId: null }],
      },
    });
    repository.readTelegramConversation.mockResolvedValueOnce(
      conversationOf('site_pick', { articleId: 'article-1', mode: 'publish', selected: [], availableSiteIds: ['site-1'] }),
    );
    const toggled = await service.handle(SECRET, callbackUpdate('tg:ts:site-1', 41), 'req-toggle');
    expect(toggled.result.ok).toBe(true);
    if (!toggled.result.ok) throw new Error('expected ok');
    expect(toggled.result.value.reply).toContain('1 situs dipilih');

    repository.readTelegramConversation.mockResolvedValueOnce(
      conversationOf('site_pick', { articleId: 'article-1', mode: 'publish', selected: ['site-1'], availableSiteIds: ['site-1'] }),
    );
    const confirmed = await service.handle(SECRET, callbackUpdate('tg:ts:go', 42), 'req-confirm');
    expect(confirmed.result.ok).toBe(true);
    expect(publicationRequest).toHaveBeenCalledTimes(1);
    const sent = publicationRequest.mock.calls[0]?.[1] as unknown as { articleId: string; siteIds: string[] };
    expect(sent.articleId).toBe('article-1');
    expect(sent.siteIds).toEqual(['site-1']);
    expect(repository.clearTelegramConversation).toHaveBeenCalled();
  });

  it('menolak tombol portal di luar daftar', async () => {
    const { service, repository } = harness();
    repository.readTelegramConversation.mockResolvedValueOnce(
      conversationOf('site_pick', { articleId: 'article-1', mode: 'publish', selected: [], availableSiteIds: ['site-1'] }),
    );
    const outcome = await service.handle(SECRET, callbackUpdate('tg:ts:site-asing', 43), 'req-toggle-bad');
    expect(outcome.result.ok).toBe(true);
    if (!outcome.result.ok) throw new Error('expected ok');
    expect(outcome.result.value.reply).toContain('tidak dikenal');
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

describe('TelegramWorkflowService organization switcher', () => {
  const options = [
    { identity: { ...identity, mappingId: 'mapping-a', organizationId: 'org-a' }, organizationName: 'Organisasi A' },
    { identity: { ...identity, mappingId: 'mapping-b', organizationId: 'org-b' }, organizationName: 'Organisasi B' },
  ];

  it('menampilkan pemilih organisasi saat akun tertaut ke banyak org', async () => {
    const { service, repository } = harness();
    repository.resolveTelegramIdentity.mockResolvedValueOnce(null);
    repository.listTelegramIdentities.mockResolvedValue(options);
    const outcome = await service.handle(SECRET, messageUpdate('/start', 50), 'req-org-picker');
    expect(outcome.result.ok).toBe(true);
    if (!outcome.result.ok) throw new Error('expected ok');
    expect(outcome.result.value.reply).toContain('Pilih organisasi aktif');
    expect(outcome.result.value.display?.keyboard?.[0]?.[0]?.data).toBe('tg:org:mapping-a');
  });

  it('memilih organisasi lewat tombol dan mengingatnya', async () => {
    const { service, repository } = harness();
    repository.resolveTelegramIdentity.mockResolvedValueOnce(null);
    repository.listTelegramIdentities.mockResolvedValue(options);
    const outcome = await service.handle(SECRET, callbackUpdate('tg:org:mapping-a', 51), 'req-org-pick');
    expect(outcome.result.ok).toBe(true);
    if (!outcome.result.ok) throw new Error('expected ok');
    expect(outcome.result.value.reply).toContain('Organisasi A aktif');
    expect(repository.clearTelegramConversation).toHaveBeenCalledTimes(1);
    const saved = repository.saveTelegramConversation.mock.calls[0] as unknown as [{ readonly mappingId: string; readonly organizationId: string }, { readonly step: string; readonly data: Readonly<Record<string, unknown>> }];
    expect(saved[0]).toMatchObject({ mappingId: 'mapping-a', organizationId: 'org-a' });
    expect(saved[1]).toMatchObject({ step: 'idle' });
    expect(saved[1].data).toMatchObject({ orgActive: true });
  });

  it('memakai organisasi terpilih tanpa bertanya lagi', async () => {
    const { service, repository } = harness();
    repository.resolveTelegramIdentity.mockResolvedValueOnce(null);
    repository.listTelegramIdentities.mockResolvedValue(options);
    repository.readTelegramConversation.mockImplementation(((ident: { readonly mappingId: string }) =>
      Promise.resolve(ident.mappingId === 'mapping-a' ? conversationOf('idle', { orgActive: true }) : null)) as never);
    const outcome = await service.handle(SECRET, messageUpdate('/artikel', 52), 'req-org-reuse');
    expect(outcome.result.ok).toBe(true);
    if (!outcome.result.ok) throw new Error('expected ok');
    expect(outcome.result.value.reply).toContain('Belum ada artikel');
  });

  it('mengabaikan baris idle tanpa penanda pilihan organisasi', async () => {
    const { service, repository } = harness();
    repository.resolveTelegramIdentity.mockResolvedValueOnce(null);
    repository.listTelegramIdentities.mockResolvedValue(options);
    repository.readTelegramConversation.mockImplementation((async () => conversationOf('idle', { messageIds: ['9'] })) as never);
    const outcome = await service.handle(SECRET, messageUpdate('/artikel', 55), 'req-org-plain-idle');
    expect(outcome.result.ok).toBe(true);
    if (!outcome.result.ok) throw new Error('expected ok');
    expect(outcome.result.value.reply).toContain('Pilih organisasi aktif');
  });

  it('teks bebas tidak menghapus pilihan organisasi', async () => {
    const { service, repository } = harness();
    repository.readTelegramConversation.mockResolvedValueOnce(conversationOf('idle', {}));
    const outcome = await service.handle(SECRET, messageUpdate('halo', 53), 'req-org-idle');
    expect(outcome.result.ok).toBe(true);
    if (!outcome.result.ok) throw new Error('expected ok');
    expect(outcome.result.value.reply).toContain('tidak dikenali');
    expect(repository.clearTelegramConversation).not.toHaveBeenCalled();
  });

  it('menolak identitas yang sama sekali tidak tertaut', async () => {
    const { service, repository } = harness();
    repository.resolveTelegramIdentity.mockResolvedValueOnce(null);
    repository.listTelegramIdentities.mockResolvedValue([]);
    const outcome = await service.handle(SECRET, messageUpdate('/start', 54), 'req-org-none');
    expect(outcome.result.ok).toBe(false);
  });
});

describe('TelegramWorkflowService button flows', () => {
  it('menampilkan tombol region saat /article', async () => {
    const { service, listEditorial } = harness();
    listEditorial.mockResolvedValueOnce({
      ok: true as const,
      value: {
        regions: [{ id: 'region-1', name: 'Jawa', status: 'active' }],
        articles: [],
        sites: [],
      },
    });
    const outcome = await service.handle(SECRET, messageUpdate('/article', 60), 'req-region-picker');
    expect(outcome.result.ok).toBe(true);
    if (!outcome.result.ok) throw new Error('expected ok');
    expect(outcome.result.value.reply).toContain('Pilih region');
    expect(outcome.result.value.display?.keyboard?.[0]?.[0]?.data).toBe('tg:rg:region-1');
  });

  it('tombol region melanjutkan wizard tanpa ketik ID', async () => {
    const { service, repository, listEditorial } = harness();
    repository.readTelegramConversation.mockResolvedValueOnce(conversationOf('article_region', {}));
    listEditorial.mockResolvedValueOnce({
      ok: true as const,
      value: { regions: [{ id: 'region-1', name: 'Jawa', status: 'active' }], articles: [], sites: [] },
    });
    const outcome = await service.handle(SECRET, callbackUpdate('tg:rg:region-1', 61), 'req-region-pick');
    expect(outcome.result.ok).toBe(true);
    if (!outcome.result.ok) throw new Error('expected ok');
    expect(outcome.result.value.reply).toContain('Kirim judul artikel');
  });

  it('menerbitkan ke semua portal sekali ketuk', async () => {
    const { service, listEditorial, publicationRequest } = harness();
    listEditorial.mockResolvedValue({
      ok: true as const,
      value: {
        regions: [],
        articles: [{ id: 'article-1', title: 'Judul', status: 'draft', createdAt: '2026-09-18T13:00:00.000Z', regionId: null }],
        sites: [
          { id: 'site-1', status: 'active', normalizedHostname: 'satu.example', regionId: null },
          { id: 'site-2', status: 'active', normalizedHostname: 'dua.example', regionId: null },
        ],
      },
    });
    const outcome = await service.handle(SECRET, callbackUpdate('tg:a:article-1:puball', 62), 'req-puball');
    expect(outcome.result.ok).toBe(true);
    expect(publicationRequest).toHaveBeenCalledTimes(1);
    const sent = publicationRequest.mock.calls[0]?.[1] as unknown as { siteIds: string[] };
    expect(sent.siteIds).toEqual(['site-1', 'site-2']);
  });

  it('menyunting pesan menu di tempat saat tombol diketuk', async () => {
    const { service, listEditorial } = harness();
    listEditorial.mockResolvedValue({
      ok: true as const,
      value: {
        regions: [],
        articles: [{ id: 'article-1', title: 'Judul', status: 'draft', createdAt: '2026-09-18T13:00:00.000Z', regionId: null }],
        sites: [],
      },
    });
    const outcome = await service.handle(SECRET, callbackUpdate('tg:a:article-1:menu', 80), 'req-edit-in-place');
    expect(outcome.result.ok).toBe(true);
    const edit = outcome.pendingReplies.find((reply) => reply.kind === 'edit');
    expect(edit).toMatchObject({ chatId: '111', messageId: '7' });
    expect(outcome.pendingReplies.filter((reply) => reply.kind === 'text')).toHaveLength(0);
  });

  it('mengirim pesan baru saat edit gagal', async () => {
    const { service, telegram } = harness();
    telegram.editMessage.mockRejectedValueOnce(new Error('message not modified'));
    await service.deliverReplies(
      [{ kind: 'edit', chatId: '111', messageId: '7', text: 'Menu', keyboard: [[{ text: 't', data: 'd' }]] }],
      'req-edit-fallback',
    );
    expect(telegram.editMessage).toHaveBeenCalledTimes(1);
    expect(telegram.send).toHaveBeenCalledTimes(1);
  });

  it('perintah tanpa ID membuka pemilih artikel', async () => {
    const { service, listEditorial } = harness();
    listEditorial.mockResolvedValueOnce({
      ok: true as const,
      value: {
        regions: [],
        articles: [{ id: 'article-1', title: 'Judul', status: 'draft', createdAt: '2026-09-18T13:00:00.000Z', regionId: null }],
        sites: [],
      },
    });
    const outcome = await service.handle(SECRET, messageUpdate('/publish', 63), 'req-publish-picker');
    expect(outcome.result.ok).toBe(true);
    if (!outcome.result.ok) throw new Error('expected ok');
    expect(outcome.result.value.reply).toContain('Pilih artikel');
    expect(outcome.result.value.display?.keyboard?.[0]?.[0]?.data).toBe('tg:a:article-1:pub');
  });

  it('teks bebas saat sesi tombol hanya mengingatkan tombol', async () => {
    const region = harness();
    region.repository.readTelegramConversation.mockResolvedValueOnce(conversationOf('article_region', {}));
    const regionOutcome = await region.service.handle(SECRET, messageUpdate('region-1', 64), 'req-nudge-region');
    expect(regionOutcome.result.ok).toBe(true);
    if (!regionOutcome.result.ok) throw new Error('expected ok');
    expect(regionOutcome.result.value.reply).toContain('Ketuk tombol region');

    const picker = harness();
    picker.repository.readTelegramConversation.mockResolvedValueOnce(
      conversationOf('publish_pick_site', { articleId: 'article-1' }),
    );
    const pickerOutcome = await picker.service.handle(SECRET, messageUpdate('site-1', 65), 'req-nudge-picker');
    expect(pickerOutcome.result.ok).toBe(true);
    if (!pickerOutcome.result.ok) throw new Error('expected ok');
    expect(pickerOutcome.result.value.reply).toContain('Ketuk tombol situs');
  });
});

describe('TelegramWorkflowService article management', () => {
  const fullArticle = {
    id: 'article-1', title: 'Judul Lama', status: 'draft', createdAt: '2026-09-18T13:00:00.000Z',
    regionId: null, version: 3, publisherId: null, categoryId: null, authorId: null,
    slug: 'judul-lama', body: 'Isi lama', source: 'Humas', tags: [],
  };
  const editorialWith = (articles: readonly unknown[]) => ({
    ok: true as const,
    value: { regions: [], articles, sites: [] },
  });

  it('membuka menu edit dari tombol artikel', async () => {
    const { service, listEditorial } = harness();
    listEditorial.mockResolvedValue(editorialWith([fullArticle]));
    const outcome = await service.handle(SECRET, callbackUpdate('tg:a:article-1:edt', 70), 'req-edit-menu');
    expect(outcome.result.ok).toBe(true);
    if (!outcome.result.ok) throw new Error('expected ok');
    expect(outcome.result.value.reply).toContain('Ubah bagian mana');
    expect(outcome.result.value.display?.keyboard?.[0]?.[0]?.data).toBe('tg:a:article-1:et');
  });

  it('mengubah judul lewat tombol, pratinjau, dan simpan', async () => {
    const { service, repository, listEditorial, updateArticle } = harness();
    listEditorial.mockResolvedValue(editorialWith([fullArticle]));
    const start = await service.handle(SECRET, callbackUpdate('tg:a:article-1:et', 71), 'req-edit-start');
    expect(start.result.ok).toBe(true);
    if (!start.result.ok) throw new Error('expected ok');
    expect(start.result.value.reply).toContain('Kirim judul baru');

    repository.readTelegramConversation.mockResolvedValueOnce(
      conversationOf('article_edit', { articleId: 'article-1', field: 'title' }),
    );
    const preview = await service.handle(SECRET, messageUpdate('Judul Baru', 72), 'req-edit-text');
    expect(preview.result.ok).toBe(true);
    if (!preview.result.ok) throw new Error('expected ok');
    expect(preview.result.value.reply).toContain('Pratinjau judul baru');
    expect(preview.result.value.display?.keyboard?.[0]?.[0]?.data).toBe('tg:e:yes');

    repository.readTelegramConversation.mockResolvedValueOnce(
      conversationOf('article_edit_confirm', { articleId: 'article-1', field: 'title', value: 'Judul Baru' }),
    );
    const done = await service.handle(SECRET, callbackUpdate('tg:e:yes', 73), 'req-edit-save');
    expect(done.result.ok).toBe(true);
    if (!done.result.ok) throw new Error('expected ok');
    expect(updateArticle).toHaveBeenCalledTimes(1);
    const sent = updateArticle.mock.calls[0]?.[1] as unknown as { id: string; expectedVersion: number; title: string; body: string };
    expect(sent).toMatchObject({ id: 'article-1', expectedVersion: 3, title: 'Judul Baru', body: 'Isi lama' });
    expect(done.result.value.reply).toContain('Artikel diperbarui');
  });

  it('menampilkan Pulihkan untuk artikel arsip dan Arsipkan untuk draf', async () => {
    const archived = harness();
    archived.listEditorial.mockResolvedValue(editorialWith([{ ...fullArticle, status: 'archived' }]));
    const archivedMenu = await archived.service.handle(SECRET, callbackUpdate('tg:a:article-1:menu', 74), 'req-menu-archived');
    expect(archivedMenu.result.ok).toBe(true);
    if (!archivedMenu.result.ok) throw new Error('expected ok');
    expect(JSON.stringify(archivedMenu.result.value.display?.keyboard)).toContain('tg:a:article-1:restore');

    const draft = harness();
    draft.listEditorial.mockResolvedValue(editorialWith([fullArticle]));
    const draftMenu = await draft.service.handle(SECRET, callbackUpdate('tg:a:article-1:menu', 75), 'req-menu-draft');
    expect(draftMenu.result.ok).toBe(true);
    if (!draftMenu.result.ok) throw new Error('expected ok');
    expect(JSON.stringify(draftMenu.result.value.display?.keyboard)).toContain('tg:a:article-1:arch');
  });

  it('mengarsipkan lewat konfirmasi tombol', async () => {
    const { service, listEditorial, archiveArticle } = harness();
    listEditorial.mockResolvedValue(editorialWith([fullArticle]));
    const confirm = await service.handle(SECRET, callbackUpdate('tg:a:article-1:arch', 76), 'req-arch');
    expect(confirm.result.ok).toBe(true);
    if (!confirm.result.ok) throw new Error('expected ok');
    expect(confirm.result.value.reply).toContain('Arsipkan');
    expect(confirm.result.value.display?.keyboard?.[0]?.[0]?.data).toBe('tg:a:article-1:archyes');

    const done = await service.handle(SECRET, callbackUpdate('tg:a:article-1:archyes', 77), 'req-archyes');
    expect(done.result.ok).toBe(true);
    if (!done.result.ok) throw new Error('expected ok');
    expect(archiveArticle).toHaveBeenCalledTimes(1);
    const sent = archiveArticle.mock.calls[0]?.[1] as unknown as { id: string; expectedVersion: number };
    expect(sent).toMatchObject({ id: 'article-1', expectedVersion: 3 });
    expect(done.result.value.reply).toContain('diarsipkan');
  });

  it('memulihkan artikel arsip ke draf', async () => {
    const { service, listEditorial, restoreArticle } = harness();
    listEditorial.mockResolvedValue(editorialWith([{ ...fullArticle, status: 'archived' }]));
    const done = await service.handle(SECRET, callbackUpdate('tg:a:article-1:restore', 78), 'req-restore');
    expect(done.result.ok).toBe(true);
    if (!done.result.ok) throw new Error('expected ok');
    expect(restoreArticle).toHaveBeenCalledTimes(1);
    expect(done.result.value.reply).toContain('dipulihkan ke draf');
  });
});

describe('TelegramWorkflowService single dashboard', () => {
  it('/start menghapus pesan dasbor terlacak lalu membuka menu baru', async () => {
    const { service, repository } = harness();
    repository.readTelegramConversation.mockResolvedValueOnce(conversationOf('idle', { messageIds: ['21', '22'] }));
    const outcome = await service.handle(SECRET, messageUpdate('/start', 90), 'req-start-clean');
    expect(outcome.result.ok).toBe(true);
    expect(repository.clearTelegramConversation).toHaveBeenCalledTimes(1);
    const deletes = outcome.pendingReplies.filter((reply) => reply.kind === 'delete');
    expect(deletes).toHaveLength(2);
    expect(outcome.pendingReplies.some((reply) => reply.kind === 'photo')).toBe(true);
    expect(outcome.identity).toMatchObject({ mappingId: 'mapping-1' });
  });

  it('tombol menu menghapus pesan asal bersama riwayat dasbor', async () => {
    const { service, repository } = harness();
    repository.readTelegramConversation.mockResolvedValueOnce(conversationOf('idle', { messageIds: ['21'] }));
    const outcome = await service.handle(SECRET, callbackUpdate('tg:menu', 91), 'req-menu-clean');
    expect(outcome.result.ok).toBe(true);
    const deletes = outcome.pendingReplies.filter((reply) => reply.kind === 'delete');
    expect(deletes.map((reply) => (reply.kind === 'delete' ? reply.messageId : null))).toEqual(['7', '21']);
  });

  it('/cancel menyimpan pelacakan pesan untuk bersih-bersih berikutnya', async () => {
    const { service, repository } = harness();
    repository.readTelegramConversation.mockResolvedValueOnce(
      conversationOf('article_title', { regionId: 'region-1', messageIds: ['21'] }),
    );
    const outcome = await service.handle(SECRET, messageUpdate('/cancel', 92), 'req-cancel-track');
    expect(outcome.result.ok).toBe(true);
    if (!outcome.result.ok) throw new Error('expected ok');
    expect(outcome.result.value.reply).toContain('dibatalkan');
    expect(repository.clearTelegramConversation).toHaveBeenCalledTimes(1);
    const saved = repository.saveTelegramConversation.mock.calls[0] as unknown as [unknown, { readonly step: string; readonly data: Readonly<Record<string, unknown>> }];
    expect(saved[1]).toMatchObject({ step: 'idle' });
    expect(saved[1].data).toMatchObject({ messageIds: ['21'] });
  });

  it('kegagalan tombol disunting di tempat dengan toast dan jalan kembali', async () => {
    const { service, listEditorial } = harness();
    listEditorial.mockResolvedValue({
      ok: true as const,
      value: {
        regions: [],
        articles: [{ id: 'other', title: 'Lain', status: 'draft', createdAt: '2026-09-18T13:00:00.000Z', regionId: null }],
        sites: [],
      },
    });
    const outcome = await service.handle(SECRET, callbackUpdate('tg:a:missing:menu', 93), 'req-fail-edit');
    expect(outcome.result.ok).toBe(false);
    const answer = outcome.pendingReplies.find((reply) => reply.kind === 'callback-answer');
    expect(answer).toMatchObject({ callbackId: 'cb-1' });
    if (answer?.kind !== 'callback-answer') throw new Error('expected answer');
    expect(answer.text).toContain('tidak tersedia');
    const edit = outcome.pendingReplies.find((reply) => reply.kind === 'edit');
    expect(edit).toMatchObject({ chatId: '111', messageId: '7' });
    if (edit?.kind !== 'edit') throw new Error('expected edit');
    expect(edit.keyboard[0]?.[0]?.data).toBe('tg:menu');
    expect(outcome.pendingReplies.filter((reply) => reply.kind === 'text')).toHaveLength(0);
  });

  it('pengiriman yang berhasil diingat untuk bersih-bersih /start', async () => {
    const { service, repository, telegram } = harness();
    telegram.send.mockResolvedValueOnce({ messageId: '31' });
    repository.readTelegramConversation.mockResolvedValueOnce(null);
    await service.deliverReplies([{ kind: 'text', chatId: '111', text: 'Halo' }], 'req-track', identity);
    expect(repository.saveTelegramConversation).toHaveBeenCalledTimes(1);
    const saved = repository.saveTelegramConversation.mock.calls[0] as unknown as [unknown, { readonly step: string; readonly data: Readonly<Record<string, unknown>> }];
    expect(saved[1]).toMatchObject({ step: 'idle' });
    expect(saved[1].data).toMatchObject({ messageIds: ['31'] });
  });

  it('pelacakan mempertahankan langkah dan data percakapan berjalan', async () => {
    const { service, repository, telegram } = harness();
    telegram.send.mockResolvedValueOnce({ messageId: '32' });
    repository.readTelegramConversation.mockResolvedValueOnce(conversationOf('article_title', { regionId: 'region-1' }));
    await service.deliverReplies([{ kind: 'text', chatId: '111', text: 'Halo' }], 'req-track-merge', identity);
    const saved = repository.saveTelegramConversation.mock.calls[0] as unknown as [unknown, { readonly step: string; readonly data: Readonly<Record<string, unknown>> }];
    expect(saved[1]).toMatchObject({ step: 'article_title' });
    expect(saved[1].data).toMatchObject({ regionId: 'region-1', messageIds: ['32'] });
  });

  it('hapus yang gagal tidak mengganggu antrean', async () => {
    const { service, telegram, repository } = harness();
    telegram.deleteMessage.mockRejectedValueOnce(new Error('message to delete not found'));
    await service.deliverReplies([{ kind: 'delete', chatId: '111', messageId: '999' }], 'req-del-fail', identity);
    expect(repository.enqueueOutboxMessage).not.toHaveBeenCalled();
  });
});
