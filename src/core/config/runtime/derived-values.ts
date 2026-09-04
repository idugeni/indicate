import 'server-only';

import { REDIS_NAMESPACE_VERSION } from '@/core/config/runtime/runtime-constants';
import type { BootstrapEnvironment } from '@/core/config/bootstrap/bootstrap-env';

export const TELEGRAM_WEBHOOK_PATH = '/api/webhooks/telegram' as const;

export function deriveTelegramWebhookUrl(normalizedWebhookHost: string): string {
  return `https://${normalizedWebhookHost}${TELEGRAM_WEBHOOK_PATH}`;
}

export function deriveRedisNamespace(environment: BootstrapEnvironment): string {
  return `indicate:${environment}:v${REDIS_NAMESPACE_VERSION}`;
}