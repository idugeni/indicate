import 'server-only';

export const TELEGRAM_WEBHOOK_PATH = '/api/webhooks/telegram' as const;

export function deriveTelegramWebhookUrl(normalizedWebhookHost: string): string {
  return `https://${normalizedWebhookHost}${TELEGRAM_WEBHOOK_PATH}`;
}

/** Redis key namespace; bumping the cache version repartitions every key. */
export function deriveRedisNamespace(environment: string, cacheVersion: number): string {
  return `indicate:${environment}:v${cacheVersion}`;
}
