import { describe, expect, it } from 'vitest';

import { TELEGRAM_WEBHOOK_PATH, deriveRedisNamespace, deriveTelegramWebhookUrl } from '@/core/config/runtime/derived-values';

describe('deriveTelegramWebhookUrl', () => {
  it('menggabung host webhook dengan path tetap', () => {
    expect(deriveTelegramWebhookUrl('webhook.indicate.web.id')).toBe(`https://webhook.indicate.web.id${TELEGRAM_WEBHOOK_PATH}`);
  });
});

describe('deriveRedisNamespace', () => {
  it('mempartisi kunci per environment dan versi cache', () => {
    expect(deriveRedisNamespace('production', 3)).toBe('indicate:production:v3');
  });
});
