import type { AuthorizedTenantActorContext } from '@/core/operation-context';
import type { TelegramMappingRecord } from '@/modules/integrations/models';
import { INTEGRATIONS_PERMISSIONS } from '@/modules/integrations/permissions';
import type { IdentifierGenerator } from '@/core/system/ports';
import { IntegrationsAccessDeniedError, IntegrationsConflictError, IntegrationsSubscriptionInactiveError, type IntegrationsRepository } from '@/modules/integrations/ports';
import { createNonDisclosingDenial, createPublicError, type PublicErrorEnvelope } from '@/core/errors';
import type { Result } from '@/core/result';
import { telegramMappingCreateSchema, telegramMappingUpdateSchema } from '@/modules/integrations/schemas';

export class TelegramMappingService {
  constructor(private readonly repository: IntegrationsRepository, private readonly identifiers: IdentifierGenerator, private readonly clock: { now(): Date } = { now: () => new Date() }) {}
  private allowed(actor: AuthorizedTenantActorContext) { return actor.permissionSet.has(INTEGRATIONS_PERMISSIONS.telegramManage); }
  private async denied(actor: AuthorizedTenantActorContext, action: string): Promise<Result<never, PublicErrorEnvelope>> {
    try { await this.repository.recordDenial(actor, action, 'telegram_mapping', this.clock.now().toISOString()); } catch { /* denial remains non-disclosing if audit persistence is unavailable */ }
    return { ok: false, error: createNonDisclosingDenial(actor.requestId) };
  }
  private async error(actor: AuthorizedTenantActorContext, action: string, value: unknown): Promise<Result<never, PublicErrorEnvelope>> {
    if (value instanceof IntegrationsAccessDeniedError) return this.denied(actor, action);
    if (value instanceof IntegrationsSubscriptionInactiveError) return { ok: false, error: createPublicError('FORBIDDEN', 'Langganan tidak aktif. Perpanjang paket untuk mengubah pemetaan Telegram.', actor.requestId) };
    if (value instanceof IntegrationsConflictError) return { ok: false, error: createPublicError('CONFLICT', 'The Telegram mapping changed before this operation.', actor.requestId) };
    return { ok: false, error: createPublicError('DEPENDENCY_UNAVAILABLE', 'Telegram mappings are temporarily unavailable.', actor.requestId) };
  }
  async list(actor: AuthorizedTenantActorContext): Promise<Result<readonly TelegramMappingRecord[], PublicErrorEnvelope>> {
    if (!this.allowed(actor)) return this.denied(actor, 'telegram_mapping.list.denied');
    try { return { ok: true, value: await this.repository.listTelegramMappings(actor) }; } catch (error) { return this.error(actor, 'telegram_mapping.list.denied', error); }
  }
  async create(actor: AuthorizedTenantActorContext, raw: unknown): Promise<Result<TelegramMappingRecord, PublicErrorEnvelope>> {
    const parsed = telegramMappingCreateSchema.safeParse(raw); if (!parsed.success) return { ok: false, error: createPublicError('INVALID_INPUT', 'Please correct the Telegram mapping fields.', actor.requestId) };
    if (!this.allowed(actor)) return this.denied(actor, 'telegram_mapping.create.denied');
    try { return { ok: true, value: await this.repository.createTelegramMapping(actor, { id: this.identifiers.create(), ...parsed.data, now: this.clock.now().toISOString() }) }; } catch (error) { return this.error(actor, 'telegram_mapping.create.denied', error); }
  }
  async update(actor: AuthorizedTenantActorContext, raw: unknown): Promise<Result<TelegramMappingRecord, PublicErrorEnvelope>> {
    const parsed = telegramMappingUpdateSchema.safeParse(raw); if (!parsed.success) return { ok: false, error: createPublicError('INVALID_INPUT', 'Please correct the Telegram mapping fields.', actor.requestId) };
    if (!this.allowed(actor)) return this.denied(actor, 'telegram_mapping.update.denied');
    try { return { ok: true, value: await this.repository.updateTelegramMapping(actor, { ...parsed.data, now: this.clock.now().toISOString() }) }; } catch (error) { return this.error(actor, 'telegram_mapping.update.denied', error); }
  }
}
