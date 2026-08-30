import type { AuthorizedTenantActorContext } from '@/domain/context/operation-context';
import type { CustomerProjection, SubscriptionRecord } from '@/domain/stage6/models';
import { STAGE6_PERMISSIONS } from '@/domain/stage6/permissions';
import type { IdentifierGenerator } from '@/ports/identifier-generator';
import { Stage6AccessDeniedError, Stage6ConflictError, type Stage6Repository } from '@/ports/stage6-repository';
import { createNonDisclosingDenial, createPublicError, type PublicErrorEnvelope } from '@/shared/errors/application-error';
import type { Result } from '@/shared/types/result';
import { customerCreateSchema, customerUpdateSchema, subscriptionUpdateSchema } from './schemas';

export class CustomerService {
  constructor(private readonly repository: Stage6Repository, private readonly identifiers: IdentifierGenerator, private readonly clock: { now(): Date } = { now: () => new Date() }) {}
  private platform(actor: AuthorizedTenantActorContext): boolean { return actor.permissionSet.has(STAGE6_PERMISSIONS.customerAdmin); }
  private async denied(actor: AuthorizedTenantActorContext, action: string, targetType: string): Promise<Result<never, PublicErrorEnvelope>> {
    try { await this.repository.recordDenial(actor, action, targetType, this.clock.now().toISOString()); } catch { /* denial remains non-disclosing if audit persistence is unavailable */ }
    return { ok: false, error: createNonDisclosingDenial(actor.requestId) };
  }
  private failure(actor: AuthorizedTenantActorContext): Result<never, PublicErrorEnvelope> { return { ok: false, error: createPublicError('DEPENDENCY_UNAVAILABLE', 'Customer administration is temporarily unavailable.', actor.requestId) }; }

  async list(actor: AuthorizedTenantActorContext): Promise<Result<readonly CustomerProjection[], PublicErrorEnvelope>> {
    if (!this.platform(actor)) return this.denied(actor, 'customer.list.denied', 'organization');
    try { return { ok: true, value: await this.repository.listCustomers(actor) }; } catch (error) { return error instanceof Stage6AccessDeniedError ? this.denied(actor, 'customer.list.denied', 'organization') : this.failure(actor); }
  }
  async read(actor: AuthorizedTenantActorContext, organizationId: string): Promise<Result<CustomerProjection, PublicErrorEnvelope>> {
    if (!this.platform(actor)) return this.denied(actor, 'customer.read.denied', 'organization');
    try { const value = await this.repository.readCustomer(actor, organizationId); return value === null ? this.denied(actor, 'customer.read.denied', 'organization') : { ok: true, value }; } catch (error) { return error instanceof Stage6AccessDeniedError ? this.denied(actor, 'customer.read.denied', 'organization') : this.failure(actor); }
  }
  async create(actor: AuthorizedTenantActorContext, raw: unknown): Promise<Result<CustomerProjection, PublicErrorEnvelope>> {
    const parsed = customerCreateSchema.safeParse(raw); if (!parsed.success) return { ok: false, error: createPublicError('INVALID_INPUT', 'Please correct the customer fields.', actor.requestId) };
    if (!this.platform(actor)) return this.denied(actor, 'customer.create.denied', 'organization');
    const now = this.clock.now().toISOString();
    try {
      return { ok: true, value: await this.repository.createCustomer(actor, {
        organizationId: this.identifiers.create(), name: parsed.data.name, slug: parsed.data.slug, customerMetadata: parsed.data.customerMetadata, now,
        ...(parsed.data.subscription === undefined ? {} : { subscription: { ...parsed.data.subscription } }),
      }) };
    } catch (error) { return error instanceof Stage6AccessDeniedError ? this.denied(actor, 'customer.create.denied', 'organization') : error instanceof Stage6ConflictError ? { ok: false, error: createPublicError('CONFLICT', 'The customer already exists.', actor.requestId) } : this.failure(actor); }
  }
  async update(actor: AuthorizedTenantActorContext, raw: unknown): Promise<Result<CustomerProjection, PublicErrorEnvelope>> {
    const parsed = customerUpdateSchema.safeParse(raw); if (!parsed.success) return { ok: false, error: createPublicError('INVALID_INPUT', 'Please correct the customer fields.', actor.requestId) };
    if (!this.platform(actor)) return this.denied(actor, 'customer.update.denied', 'organization');
    try { return { ok: true, value: await this.repository.updateCustomer(actor, { ...parsed.data, now: this.clock.now().toISOString() }) }; }
    catch (error) { return error instanceof Stage6AccessDeniedError ? this.denied(actor, 'customer.update.denied', 'organization') : error instanceof Stage6ConflictError ? { ok: false, error: createPublicError('CONFLICT', 'The customer changed before this update.', actor.requestId) } : this.failure(actor); }
  }
  async readSubscription(actor: AuthorizedTenantActorContext): Promise<Result<SubscriptionRecord | null, PublicErrorEnvelope>> {
    if (!actor.permissionSet.has(STAGE6_PERMISSIONS.subscriptionRead) && !actor.permissionSet.has(STAGE6_PERMISSIONS.subscriptionManage)) return this.denied(actor, 'subscription.read.denied', 'subscription');
    try { return { ok: true, value: await this.repository.readSubscription(actor) }; } catch (error) { return error instanceof Stage6AccessDeniedError ? this.denied(actor, 'subscription.read.denied', 'subscription') : this.failure(actor); }
  }
  async updateSubscription(actor: AuthorizedTenantActorContext, raw: unknown): Promise<Result<SubscriptionRecord, PublicErrorEnvelope>> {
    const parsed = subscriptionUpdateSchema.safeParse(raw); if (!parsed.success) return { ok: false, error: createPublicError('INVALID_INPUT', 'Please correct the subscription fields.', actor.requestId) };
    const platform = this.platform(actor);
    if (!platform && (actor.organizationId !== parsed.data.organizationId || !actor.permissionSet.has(STAGE6_PERMISSIONS.subscriptionManage))) return this.denied(actor, 'subscription.update.denied', 'subscription');
    try {
      const value = parsed.data;
      return { ok: true, value: await this.repository.updateSubscription(actor, {
        organizationId: value.organizationId,
        plan: value.plan,
        status: value.status,
        periodStartsAt: value.periodStartsAt,
        periodEndsAt: value.periodEndsAt,
        now: this.clock.now().toISOString(),
        platform,
        ...(value.expectedVersion === undefined ? {} : { expectedVersion: value.expectedVersion }),
      }) };
    }
    catch (error) { return error instanceof Stage6AccessDeniedError ? this.denied(actor, 'subscription.update.denied', 'subscription') : error instanceof Stage6ConflictError ? { ok: false, error: createPublicError('CONFLICT', 'The subscription changed before this update.', actor.requestId) } : this.failure(actor); }
  }
}
