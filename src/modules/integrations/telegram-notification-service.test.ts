import { describe, expect, it, vi } from 'vitest';

import { TelegramNotificationService } from '@/modules/integrations/telegram-notification-service';

function harness(repoOverrides: Record<string, unknown> = {}) {
  const repository = {
    listOrganizationGroupChats: vi.fn(async () => ['-1001', '-1002']),
    enqueueOutboxMessage: vi.fn(async (input: { readonly chatId: string; readonly text: string }) => ({ id: 'outbox-1', input })),
    ...repoOverrides,
  };
  const service = new TelegramNotificationService(repository as never, 'https://indicate.web.id/tg/app');
  return { repository, service };
}

describe('TelegramNotificationService', () => {
  it('mengantrekan kabar artikel ke setiap grup terikat', async () => {
    const { repository, service } = harness();
    await service.notifyArticleCreated({ organizationId: 'org-1', articleId: 'art-1', title: 'Rilis' });
    expect(repository.enqueueOutboxMessage).toHaveBeenCalledTimes(2);
    const first = repository.enqueueOutboxMessage.mock.calls[0]?.[0];
    expect(first?.chatId).toBe('-1001');
    expect(first?.text).toContain('Draf artikel baru dibuat.');
  });

  it('tidak antre apa pun tanpa grup terikat', async () => {
    const { repository, service } = harness({ listOrganizationGroupChats: async () => [] });
    await service.notifyJobTerminal({
      organizationId: 'org-1', jobId: 'job-1', articleTitle: 'Rilis', finishedAt: '2026-09-19T11:00:00.000Z',
      published: [{ hostname: 'portal.test', url: 'https://portal.test/a' }], failed: [],
    });
    expect(repository.enqueueOutboxMessage).not.toHaveBeenCalled();
  });

  it('tidak pernah melempar saat repo gagal', async () => {
    const { service } = harness({ listOrganizationGroupChats: async () => { throw new Error('down'); } });
    await expect(service.notifyArticleCreated({ organizationId: 'org-1', articleId: 'art-1', title: 'Rilis' })).resolves.toBeUndefined();
  });
});
