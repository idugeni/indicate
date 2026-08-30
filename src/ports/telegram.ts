import type { HealthCheckPort } from '@/ports/health-check';

export interface TelegramMessage {
  readonly chatId: string;
  readonly text: string;
}

export interface TelegramPort extends HealthCheckPort {
  send(message: TelegramMessage): Promise<void>;
}
