import { describe, expect, it } from 'vitest';

import { handleTelegramSecretReadiness } from '@/app/api/webhooks/readiness/telegram-secret/route';
import { RateLimitService } from '@/application/stage6/rate-limit-service';
import { InMemoryRateLimitAdapter } from '@/infrastructure/testing/rate-limit-memory';
import { stage7RuntimeConfig } from '../helpers/stage7';

function request(config: ReturnType<typeof stage7RuntimeConfig>, secret: string, includeEdgeProof = true): Request {
  return new Request(`https://${config.hosts.webhook}/api/webhooks/readiness/telegram-secret`, {
    method: 'POST',
    headers: {
      host: config.hosts.webhook,
      'cf-connecting-ip': '198.51.100.20',
      ...(includeEdgeProof ? { 'x-indicate-cloudflare-origin': config.cloudflare.originSecret } : {}),
      'x-telegram-bot-api-secret-token': secret,
    },
  });
}

describe('Telegram secret readiness challenge', () => {
  it('uses one atomic dedicated-capacity challenge and remains repeatable when webhook allowance is one', async () => {
    const config = stage7RuntimeConfig({ RATE_LIMIT_WEBHOOK_ALLOWANCE: '1' });
    const limiter = new RateLimitService(new InMemoryRateLimitAdapter());
    await expect(handleTelegramSecretReadiness(request(config, config.telegram.webhookSecret), config, limiter)).resolves.toMatchObject({ status: 204 });
    await expect(handleTelegramSecretReadiness(request(config, config.telegram.webhookSecret), config, limiter)).resolves.toMatchObject({ status: 204 });
  });

  it('rejects a mismatched secret without returning secret-derived material', async () => {
    const config = stage7RuntimeConfig({ RATE_LIMIT_WEBHOOK_ALLOWANCE: '1' });
    const response = await handleTelegramSecretReadiness(request(config, 'mismatched-secret-value'), config, new RateLimitService(new InMemoryRateLimitAdapter()));
    expect(response.status).toBe(404);
    expect(await response.text()).toBe('');
  });

  it('fails closed on limiter outage', async () => {
    const config = stage7RuntimeConfig();
    const adapter = new InMemoryRateLimitAdapter();
    adapter.failNext = true;
    const response = await handleTelegramSecretReadiness(request(config, config.telegram.webhookSecret), config, new RateLimitService(adapter));
    expect(response.status).toBe(503);
    expect(await response.text()).toBe('');
  });

  it('rejects missing Cloudflare edge proof before rate-limit or secret work', async () => {
    const config = stage7RuntimeConfig();
    const response = await handleTelegramSecretReadiness(request(config, config.telegram.webhookSecret, false), config, new RateLimitService(new InMemoryRateLimitAdapter()));
    expect(response.status).toBe(404);
    expect(await response.text()).toBe('');
  });
});
