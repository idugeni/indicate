import { logEvent } from '@/core/observability/logger';
import type { IntegrationsRepository } from '@/modules/integrations/ports';
import { composeArticleCreated, composeJobFailed, composeJobPublished } from '@/modules/integrations/telegram-notifications';
import type { JobTerminalNotice } from '@/modules/publishing/ports';

interface ClockLike { now(): Date }

/**
 * Mengantrekan pemberitahuan event redaksi ke grup Telegram organisasi.
 *
 * @remarks Best-effort murni: tanpa grup terikat tidak ada pesan, dan setiap
 * kegagalan hanya telemetri — pemanggil (worker, layanan artikel) tidak
 * pernah gagal karena notifikasi.
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
   * Mengantrekan kabar draf artikel baru ke grup organisasi.
   *
   * @param input - Identitas organisasi, artikel, dan korelasi.
   */
  async notifyArticleCreated(input: { readonly organizationId: string; readonly articleId: string; readonly title: string; readonly requestId?: string }): Promise<void> {
    await this.sendToGroups(
      input.organizationId,
      composeArticleCreated({ articleId: input.articleId, title: input.title, miniAppUrl: this.miniAppUrl }),
      input.requestId ?? `article:${input.articleId}`,
    );
  }

  /**
   * Mengantrekan kabar final pekerjaan penerbitan ke grup organisasi.
   *
   * @param input - Hasil final pekerjaan beserta konteks tampilannya.
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
