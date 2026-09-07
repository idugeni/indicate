import 'server-only';

import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { ExactObjectAuthorization } from '@/integrations/storage/ports';
import type { TelegramPort } from '@/modules/integrations/ports';
import { TelegramRateLimitedError } from '@/modules/integrations/ports';
import type { PreparedTelegramMedia, TelegramMediaTransferPort } from '@/modules/integrations/ports';

const fileResponseSchema = z.object({ ok: z.literal(true), result: z.object({ file_path: z.string().min(1).max(500) }) });

export class TelegramBotApiAdapter implements TelegramPort, TelegramMediaTransferPort {
  private readonly base: string;

  constructor(
    private readonly token: string,
    private readonly maxDownloadBytes: number,
    private readonly fetcher: typeof fetch = fetch,
  ) {
    this.base = `https://api.telegram.org/bot${encodeURIComponent(token)}`;
  }

  async check() {
    try {
      const response = await this.fetcher(`${this.base}/getMe`, { signal: AbortSignal.timeout(5_000) });
      return { service: 'telegram', status: response.ok ? 'healthy' as const : 'unhealthy' as const, category: response.ok ? 'telegram_ready' : 'telegram_unavailable' };
    } catch {
      return { service: 'telegram', status: 'unhealthy' as const, category: 'telegram_unavailable' };
    }
  }

  async send(message: { readonly chatId: string; readonly text: string }): Promise<void> {
    const response = await this.fetcher(`${this.base}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: message.chatId, text: message.text.slice(0, 4096), disable_web_page_preview: true }),
      signal: AbortSignal.timeout(10_000),
    });
    if (response.status === 429) {
      // Hormati batas Bot API: lempar terketik agar pemanggil mengantrekan ulang dengan backoff, bukan membanjiri.
      const payload = (await response.json().catch(() => null)) as { readonly parameters?: { readonly retry_after?: unknown } } | null;
      const retryAfter = payload?.parameters?.retry_after;
      throw new TelegramRateLimitedError(typeof retryAfter === 'number' && retryAfter > 0 ? Math.floor(retryAfter) : null);
    }
    if (!response.ok) throw new Error('Telegram send failed.');
  }

  async prepare(input: { readonly fileId: string; readonly expectedSize: number }): Promise<PreparedTelegramMedia> {
    if (input.expectedSize <= 0 || input.expectedSize > this.maxDownloadBytes) throw new Error('Telegram file size is outside the configured media policy.');
    const fileResponse = await this.fetcher(`${this.base}/getFile?file_id=${encodeURIComponent(input.fileId)}`, { signal: AbortSignal.timeout(10_000) });
    const file = fileResponseSchema.safeParse(await fileResponse.json().catch(() => null));
    if (!fileResponse.ok || !file.success || file.data.result.file_path.includes('..')) throw new Error('Telegram file lookup failed.');
    const downloadUrl = new URL(`/file/bot${encodeURIComponent(this.token)}/${file.data.result.file_path.replace(/^\/+/, '')}`, 'https://api.telegram.org');
    if (downloadUrl.origin !== 'https://api.telegram.org') throw new Error('Telegram file origin invalid.');
    const download = await this.fetcher(downloadUrl, { signal: AbortSignal.timeout(30_000) });
    if (!download.ok) throw new Error('Telegram file download failed.');
    const declared = Number(download.headers.get('content-length'));
    if (Number.isFinite(declared) && declared !== input.expectedSize) throw new Error('Telegram file size mismatch.');
    const bytes = await download.arrayBuffer();
    if (bytes.byteLength !== input.expectedSize || bytes.byteLength > this.maxDownloadBytes) throw new Error('Telegram file size mismatch.');
    const checksumSha256 = createHash('sha256').update(Buffer.from(bytes)).digest('base64');
    return Object.freeze({ bytes, sizeBytes: bytes.byteLength, checksumSha256 });
  }

  async transfer(input: { readonly media: PreparedTelegramMedia; readonly authorization: ExactObjectAuthorization; readonly mediaType: string }): Promise<void> {
    if (input.media.bytes.byteLength !== input.media.sizeBytes) throw new Error('Prepared media size mismatch.');
    const expectedChecksum = input.authorization.requiredHeaders['x-amz-checksum-sha256'];
    if (expectedChecksum !== input.media.checksumSha256) throw new Error('Prepared media checksum mismatch.');
    const upload = await this.fetcher(input.authorization.url, {
      method: 'PUT',
      headers: { ...input.authorization.requiredHeaders, 'content-type': input.mediaType },
      body: input.media.bytes,
      signal: AbortSignal.timeout(30_000),
    });
    if (!upload.ok) throw new Error('Media upload failed.');
  }
}
