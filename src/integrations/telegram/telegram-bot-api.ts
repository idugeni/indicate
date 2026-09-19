import 'server-only';

import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { ExactObjectAuthorization } from '@/integrations/storage/ports';
import type { TelegramBotCommand, TelegramCallbackAnswer, TelegramEditMessage, TelegramPhotoMessage, TelegramPort } from '@/modules/integrations/ports';
import { TelegramRateLimitedError } from '@/modules/integrations/ports';
import type { PreparedTelegramMedia, TelegramMediaTransferPort, TelegramMessage, TelegramSentReceipt } from '@/modules/integrations/ports';
import type { TelegramInlineKeyboard } from '@/modules/integrations/models';

const fileResponseSchema = z.object({ ok: z.literal(true), result: z.object({ file_path: z.string().min(1).max(500) }) });
const sentResponseSchema = z.object({ ok: z.literal(true), result: z.object({ message_id: z.union([z.number().int(), z.string().regex(/^\d+$/)]) }) });

const toInlineKeyboard = (keyboard: TelegramInlineKeyboard) => keyboard.map((row) => row.map((button) => ({ text: button.text.slice(0, 64), callback_data: button.data.slice(0, 64) })));

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

  private async throwIfRateLimited(response: Response): Promise<void> {
    if (response.status !== 429) return;
    const payload = (await response.json().catch(() => null)) as { readonly parameters?: { readonly retry_after?: unknown } } | null;
    const retryAfter = payload?.parameters?.retry_after;
    throw new TelegramRateLimitedError(typeof retryAfter === 'number' && retryAfter > 0 ? Math.floor(retryAfter) : null);
  }

  async send(message: TelegramMessage): Promise<TelegramSentReceipt> {
    const response = await this.fetcher(`${this.base}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: message.chatId,
        text: message.text.slice(0, 4096),
        disable_web_page_preview: true,
        ...(message.keyboard === undefined ? {} : { reply_markup: { inline_keyboard: toInlineKeyboard(message.keyboard) } }),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    await this.throwIfRateLimited(response);
    if (!response.ok) throw new Error('Telegram send failed.');
    const parsed = sentResponseSchema.safeParse(await response.json().catch(() => null));
    if (!parsed.success) throw new Error('Telegram send failed.');
    return Object.freeze({ messageId: String(parsed.data.result.message_id) });
  }

  async sendPhoto(message: TelegramPhotoMessage): Promise<TelegramSentReceipt> {
    const response = await this.fetcher(`${this.base}/sendPhoto`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: message.chatId,
        photo: message.photoUrl,
        caption: message.caption.slice(0, 1024),
        ...(message.keyboard === undefined ? {} : { reply_markup: { inline_keyboard: toInlineKeyboard(message.keyboard) } }),
      }),
      signal: AbortSignal.timeout(15_000),
    });
    await this.throwIfRateLimited(response);
    if (!response.ok) throw new Error('Telegram photo send failed.');
    const parsed = sentResponseSchema.safeParse(await response.json().catch(() => null));
    if (!parsed.success) throw new Error('Telegram photo send failed.');
    return Object.freeze({ messageId: String(parsed.data.result.message_id) });
  }

  async answerCallback(answer: TelegramCallbackAnswer): Promise<void> {
    const response = await this.fetcher(`${this.base}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: answer.callbackId,
        ...(answer.text === undefined ? {} : { text: answer.text.slice(0, 200) }),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    await this.throwIfRateLimited(response);
    if (!response.ok) throw new Error('Telegram callback answer failed.');
  }

  async editMessage(message: TelegramEditMessage): Promise<void> {
    const response = await this.fetcher(`${this.base}/editMessageText`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: message.chatId,
        message_id: Number(message.messageId),
        text: message.text.slice(0, 4096),
        disable_web_page_preview: true,
        ...(message.keyboard === undefined ? {} : { reply_markup: { inline_keyboard: toInlineKeyboard(message.keyboard) } }),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    await this.throwIfRateLimited(response);
    if (!response.ok) throw new Error('Telegram message edit failed.');
  }

  async deleteMessage(message: { readonly chatId: string; readonly messageId: string }): Promise<void> {
    const response = await this.fetcher(`${this.base}/deleteMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: message.chatId, message_id: Number(message.messageId) }),
      signal: AbortSignal.timeout(10_000),
    });
    await this.throwIfRateLimited(response);
    if (!response.ok) throw new Error('Telegram message delete failed.');
  }

  async setMyCommands(commands: readonly TelegramBotCommand[]): Promise<void> {
    const response = await this.fetcher(`${this.base}/setMyCommands`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        commands: commands.map(({ command, description }) => ({
          command: command.replace(/^\//, '').slice(0, 32),
          description: description.slice(0, 256),
        })),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    await this.throwIfRateLimited(response);
    if (!response.ok) throw new Error('Telegram command menu update failed.');
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
