import type { AuthorizedTenantActorContext } from '@/core/operation-context';
import { z } from 'zod';
import type { CustomerProjection, SubscriptionRecord } from '@/modules/integrations/models';
import { INTEGRATIONS_PERMISSIONS } from '@/modules/integrations/permissions';
import type { IdentifierGenerator } from '@/core/system/ports';
import { IntegrationsAccessDeniedError, IntegrationsConflictError, type IntegrationsRepository } from '@/modules/integrations/ports';
import { createNonDisclosingDenial, createPublicError, type PublicErrorEnvelope } from '@/core/errors';
import type { Result } from '@/core/result';
import { customerCreateSchema, customerUpdateSchema, subscriptionUpdateSchema } from '@/modules/integrations/schemas';

export class CustomerService {
  constructor(private readonly repository: IntegrationsRepository, private readonly identifiers: IdentifierGenerator, private readonly clock: { now(): Date } = { now: () => new Date() }) {}
  private platform(actor: AuthorizedTenantActorContext): boolean {
    return actor.platformPermissionSet?.has(INTEGRATIONS_PERMISSIONS.superAdmin) === true
      || actor.platformPermissionSet?.has(INTEGRATIONS_PERMISSIONS.customerAdmin) === true;
  }
  private async denied(actor: AuthorizedTenantActorContext, action: string, targetType: string): Promise<Result<never, PublicErrorEnvelope>> {
    try { await this.repository.recordDenial(actor, action, targetType, this.clock.now().toISOString()); } catch { /* denial remains non-disclosing if audit persistence is unavailable */ }
    return { ok: false, error: createNonDisclosingDenial(actor.requestId) };
  }
  private failure(actor: AuthorizedTenantActorContext): Result<never, PublicErrorEnvelope> { return { ok: false, error: createPublicError('DEPENDENCY_UNAVAILABLE', 'Customer administration is temporarily unavailable.', actor.requestId) }; }

  async list(actor: AuthorizedTenantActorContext): Promise<Result<readonly CustomerProjection[], PublicErrorEnvelope>> {
    if (!this.platform(actor)) return this.denied(actor, 'customer.list.denied', 'organization');
    try { return { ok: true, value: await this.repository.listCustomers(actor) }; } catch (error) { return error instanceof IntegrationsAccessDeniedError ? this.denied(actor, 'customer.list.denied', 'organization') : this.failure(actor); }
  }
  async read(actor: AuthorizedTenantActorContext, organizationId: string): Promise<Result<CustomerProjection, PublicErrorEnvelope>> {
    if (!this.platform(actor)) return this.denied(actor, 'customer.read.denied', 'organization');
    try { const value = await this.repository.readCustomer(actor, organizationId); return value === null ? this.denied(actor, 'customer.read.denied', 'organization') : { ok: true, value }; } catch (error) { return error instanceof IntegrationsAccessDeniedError ? this.denied(actor, 'customer.read.denied', 'organization') : this.failure(actor); }
  }
  async create(actor: AuthorizedTenantActorContext, raw: unknown): Promise<Result<CustomerProjection, PublicErrorEnvelope>> {
    const parsed = customerCreateSchema.safeParse(raw); if (!parsed.success) return { ok: false, error: createPublicError('INVALID_INPUT', 'Please correct the customer fields.', actor.requestId) };
    if ((parsed.data.subscription?.status as string | undefined) === 'trialing') return { ok: false, error: createPublicError('INVALID_INPUT', 'Trial subscriptions are disabled. Choose an active plan.', actor.requestId) };
    if (!this.platform(actor)) return this.denied(actor, 'customer.create.denied', 'organization');
    const now = this.clock.now().toISOString();
    try {
      return { ok: true, value: await this.repository.createCustomer(actor, {
        organizationId: this.identifiers.create(), name: parsed.data.name, slug: parsed.data.slug, customerMetadata: parsed.data.customerMetadata, now,
        ...(parsed.data.subscription === undefined ? {} : { subscription: { ...parsed.data.subscription } }),
      }) };
    } catch (error) { return error instanceof IntegrationsAccessDeniedError ? this.denied(actor, 'customer.create.denied', 'organization') : error instanceof IntegrationsConflictError ? { ok: false, error: createPublicError('CONFLICT', 'The customer already exists.', actor.requestId) } : this.failure(actor); }
  }
  async update(actor: AuthorizedTenantActorContext, raw: unknown): Promise<Result<CustomerProjection, PublicErrorEnvelope>> {
    const parsed = customerUpdateSchema.safeParse(raw); if (!parsed.success) return { ok: false, error: createPublicError('INVALID_INPUT', 'Please correct the customer fields.', actor.requestId) };
    if (!this.platform(actor)) return this.denied(actor, 'customer.update.denied', 'organization');
    try { return { ok: true, value: await this.repository.updateCustomer(actor, { ...parsed.data, now: this.clock.now().toISOString() }) }; }
    catch (error) { return error instanceof IntegrationsAccessDeniedError ? this.denied(actor, 'customer.update.denied', 'organization') : error instanceof IntegrationsConflictError ? { ok: false, error: createPublicError('CONFLICT', 'The customer changed before this update.', actor.requestId) } : this.failure(actor); }
  }
  async readSubscription(actor: AuthorizedTenantActorContext): Promise<Result<SubscriptionRecord | null, PublicErrorEnvelope>> {
    if (!actor.permissionSet.has(INTEGRATIONS_PERMISSIONS.subscriptionRead) && !actor.permissionSet.has(INTEGRATIONS_PERMISSIONS.subscriptionManage)) return this.denied(actor, 'subscription.read.denied', 'subscription');
    try { return { ok: true, value: await this.repository.readSubscription(actor) }; } catch (error) { return error instanceof IntegrationsAccessDeniedError ? this.denied(actor, 'subscription.read.denied', 'subscription') : this.failure(actor); }
  }
  async updateSubscription(actor: AuthorizedTenantActorContext, raw: unknown): Promise<Result<SubscriptionRecord, PublicErrorEnvelope>> {
    const parsed = subscriptionUpdateSchema.safeParse(raw); if (!parsed.success) return { ok: false, error: createPublicError('INVALID_INPUT', 'Please correct the subscription fields.', actor.requestId) };
    if ((parsed.data as { status?: string }).status === 'trialing') return { ok: false, error: createPublicError('INVALID_INPUT', 'Trial subscriptions are disabled.', actor.requestId) };
    const platform = this.platform(actor);
    if (!platform && (actor.organizationId !== parsed.data.organizationId || !actor.permissionSet.has(INTEGRATIONS_PERMISSIONS.subscriptionManage))) return this.denied(actor, 'subscription.update.denied', 'subscription');
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
    catch (error) { return error instanceof IntegrationsAccessDeniedError ? this.denied(actor, 'subscription.update.denied', 'subscription') : error instanceof IntegrationsConflictError ? { ok: false, error: createPublicError('CONFLICT', 'The subscription changed before this update.', actor.requestId) } : this.failure(actor); }
  }

  async assignFirstAdmin(actor: AuthorizedTenantActorContext, raw: unknown): Promise<Result<{ readonly userId: string; readonly roleId: string }, PublicErrorEnvelope>> {
    const parsed = z.object({ organizationId: z.uuid(), userEmail: z.string().trim().min(3).max(320) }).strict().safeParse(raw);
    if (!parsed.success) return { ok: false, error: createPublicError('INVALID_INPUT', 'Please correct the admin assignment fields.', actor.requestId) };
    if (!this.platform(actor)) return this.denied(actor, 'membership.assign-first.denied', 'membership');
    try {
      const value = await this.repository.assignFirstAdminMember(actor, {
        organizationId: parsed.data.organizationId, userEmail: parsed.data.userEmail, now: this.clock.now().toISOString(),
      });
      return { ok: true, value };
    } catch (error) { return error instanceof IntegrationsAccessDeniedError ? this.denied(actor, 'membership.assign-first.denied', 'membership') : this.failure(actor); }
  }
}
