import { describe, expect, it, vi } from 'vitest';

import { TelegramBotApiAdapter } from '@/integrations/telegram/telegram-bot-api';
import { TelegramRateLimitedError } from '@/modules/integrations/ports';

const okJson = (payload: unknown, status = 200) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => payload }) as unknown as Response;
const NOW_ISO = new Date('2026-09-18T14:00:00.000Z');

function harness(handler: (url: string) => Promise<Response>) {
  const fetcher = vi.fn(async (input: unknown, _init: unknown) => handler(String(input)));
  const adapter = new TelegramBotApiAdapter('token-1', 5_000_000, fetcher as unknown as typeof fetch);
  return { adapter, fetcher };
}

describe('TelegramBotApiAdapter check', () => {
  it('sehat saat getMe ok dan tidak sehat saat gagal', async () => {
    const healthy = harness(async () => okJson({ ok: true }));
    expect(await healthy.adapter.check()).toMatchObject({ status: 'healthy', category: 'telegram_ready' });

    const sick = harness(async () => okJson({ ok: false }, 500));
    expect(await sick.adapter.check()).toMatchObject({ status: 'unhealthy' });

    const down = harness(async () => {
      throw new Error('network');
    });
    expect(await down.adapter.check()).toMatchObject({ status: 'unhealthy', category: 'telegram_unavailable' });
  });
});

describe('TelegramBotApiAdapter send', () => {
  it('memotong teks dan memetakan keyboard', async () => {
    const { adapter, fetcher } = harness(async () => okJson({ ok: true }));
    await adapter.send({ chatId: '111', text: 'x'.repeat(5000), keyboard: [[{ text: 't'.repeat(100), data: 'd'.repeat(100) }]] });
    const body = JSON.parse(String(((fetcher.mock.calls[0]?.[1] as unknown as { body: string }).body))) as {
      text: string;
      reply_markup: { inline_keyboard: { text: string; callback_data: string }[][] };
    };
    expect(body.text).toHaveLength(4096);
    expect(body.reply_markup.inline_keyboard[0]?.[0]?.text).toHaveLength(64);
  });

  it('melempar rate limited beserta retry_after', async () => {
    const { adapter } = harness(async () => ({ ...okJson({ parameters: { retry_after: 7 } }, 429), json: async () => ({ parameters: { retry_after: 7 } }) }));
    const error = await adapter.send({ chatId: '111', text: 'halo' }).catch((value: unknown) => value);
    expect(error).toBeInstanceOf(TelegramRateLimitedError);
    expect((error as TelegramRateLimitedError).retryAfterSeconds).toBe(7);
  });

  it('melempar saat telegram menolak', async () => {
    const { adapter } = harness(async () => okJson({ ok: false }, 400));
    await expect(adapter.send({ chatId: '111', text: 'halo' })).rejects.toThrow('Telegram send failed.');
    await expect(adapter.answerCallback({ callbackId: 'cb-1' })).rejects.toThrow('Telegram callback answer failed.');
  });
});

describe('TelegramBotApiAdapter prepare transfer', () => {
  it('menolak ukuran di luar policy sebelum fetch', async () => {
    const { adapter, fetcher } = harness(async () => okJson({}));
    await expect(adapter.prepare({ fileId: 'f-1', expectedSize: 0 })).rejects.toThrow('outside the configured media policy');
    await expect(adapter.prepare({ fileId: 'f-1', expectedSize: 99_000_000 })).rejects.toThrow('outside the configured media policy');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('menolak path traversal pada file_path', async () => {
    const { adapter } = harness(async () => okJson({ ok: true, result: { file_path: '../evil.jpg' } }));
    await expect(adapter.prepare({ fileId: 'f-1', expectedSize: 10 })).rejects.toThrow('file lookup failed');
  });

  it('menolak checksum transfer yang tidak cocok', async () => {
    const { adapter } = harness(async () => okJson({}));
    const media = { bytes: new Uint8Array([1, 2, 3]).buffer, sizeBytes: 3, checksumSha256: 'abc' };
    await expect(
      adapter.transfer({ media, authorization: { url: 'https://put.example', key: 'k', expiresAt: NOW_ISO, requiredHeaders: { 'x-amz-checksum-sha256': 'beda' } }, mediaType: 'image/jpeg' }),
    ).rejects.toThrow('checksum mismatch');
  });
});
