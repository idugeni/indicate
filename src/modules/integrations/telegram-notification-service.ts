import { logEvent } from '@/core/observability/logger';
import type { IntegrationsRepository } from '@/modules/integrations/ports';
import { composeArticleCreated, composeJobFailed, composeJobPublished } from '@/modules/integrations/telegram-notifications';
import type { JobTerminalNotice } from '@/modules/publishing/ports';

interface ClockLike { now(): Date }

/**
 * Queue editorial event notifications to the organization's Telegram group.
 *
 * @remarks Pure best-effort: with no bound group there is no message, and every
 * failure is telemetry only — callers (worker, article service) never
 * fail because of notifications.
 */
export class TelegramNotificationService {
  constructor(
    private readonly repository: IntegrationsRepository,
    private readonly miniAppUrl: string,
    private readonly clock: ClockLike = { now: () => new Date() },
  ) {}

  private async sendToGroups(organizationId: string, text: string, requestId: string): Promise<void> {
    try {
      const chats = await this.repository.listOrganizationGroupChats(organizationId);
      const now = this.clock.now().toISOString();
      for (const chatId of chats) {
        await this.repository.enqueueOutboxMessage({ organizationId, chatId, text, now });
      }
    } catch (error) {
      logEvent('warn', { event: 'telegram.notify.failed', requestId, context: { name: error instanceof Error ? error.name : 'UnknownError' } });
    }
  }

  /**
   * Queue news of a new article draft to the organization group.
   *
   * @param input - Organization, article, and correlation identity.
   */
  async notifyArticleCreated(input: { readonly organizationId: string; readonly articleId: string; readonly title: string; readonly requestId?: string }): Promise<void> {
    await this.sendToGroups(
      input.organizationId,
      composeArticleCreated({ articleId: input.articleId, title: input.title, miniAppUrl: this.miniAppUrl }),
      input.requestId ?? `article:${input.articleId}`,
    );
  }

  /**
   * Queue the final news of a publication job to the organization group.
   *
   * @param input - Final job result with its display context.
   */
  async notifyJobTerminal(input: JobTerminalNotice & { readonly requestId?: string }): Promise<void> {
    const text = input.failed.length === 0
      ? composeJobPublished({ title: input.articleTitle, published: input.published, finishedAt: input.finishedAt })
      : composeJobFailed({
        title: input.articleTitle,
        jobId: input.jobId,
        failures: input.failed,
        publishedHostnames: input.published.map((target) => target.hostname),
        miniAppUrl: this.miniAppUrl,
      });
    await this.sendToGroups(input.organizationId, text, input.requestId ?? `job:${input.jobId}`);
  }
}
