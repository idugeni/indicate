import { promisify } from 'node:util';
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

import type { AuthorizedTenantActorContext } from '@/core/operation-context';
import type { ApiKeyRecord, IssuedApiKey } from '@/modules/integrations/models';
import { INTEGRATIONS_PERMISSIONS } from '@/modules/integrations/permissions';
import type { IdentifierGenerator } from '@/core/system/ports';
import { IntegrationsAccessDeniedError, IntegrationsConflictError, IntegrationsSubscriptionInactiveError, type NewStoredApiKey, type IntegrationsRepository } from '@/modules/integrations/ports';
import { createNonDisclosingDenial, createPublicError, type PublicErrorEnvelope } from '@/core/errors';
import type { Result } from '@/core/result';
import { apiKeyIssueSchema, apiKeyRevokeSchema, apiKeyRotateSchema } from '@/modules/integrations/schemas';

const derive = promisify(scrypt);
const PREFIX = 'ind_live';
const SECRET_BYTES = 32;
const HASH_BYTES = 64;

export interface ApiKeyCredentialMaterial {
  readonly plaintext: string;
  readonly lookupId: string;
  readonly salt: string;
  readonly verificationHash: string;
}
export interface CredentialGenerator { create(): ApiKeyCredentialMaterial }
export interface ApiKeyHasher { hash(secret: string, salt: string): Promise<string>; verify(secret: string, salt: string, expectedHash: string): Promise<boolean> }
export class ScryptApiKeyHasher implements ApiKeyHasher {
  async hash(secret: string, salt: string): Promise<string> { return deriveApiKeyHash(secret, salt); }
  async verify(secret: string, salt: string, expectedHash: string): Promise<boolean> { return safeEqual(await this.hash(secret, salt), expectedHash); }
}

const base64url = (value: Uint8Array) => Buffer.from(value).toString('base64url');
export class SecureApiKeyCredentialGenerator implements CredentialGenerator {
  create(): ApiKeyCredentialMaterial {
    const lookupId = base64url(randomBytes(12));
    const secret = base64url(randomBytes(SECRET_BYTES));
    const salt = randomBytes(16).toString('base64');
    return { plaintext: `${PREFIX}_${lookupId}.${secret}`, lookupId, salt, verificationHash: '' };
  }
}

export async function deriveApiKeyHash(secret: string, salt: string): Promise<string> {
  return Buffer.from(await derive(secret, Buffer.from(salt, 'base64'), HASH_BYTES) as ArrayBuffer).toString('base64');
}
function parseCredential(plaintext: string): { lookupId: string; secret: string } | null {
  const match = /^ind_live_([A-Za-z0-9_-]{16})\.([A-Za-z0-9_-]{43})$/.exec(plaintext);
  return match === null ? null : { lookupId: match[1]!, secret: match[2]! };
}
function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left, 'base64'); const b = Buffer.from(right, 'base64');
  return a.length === b.length && timingSafeEqual(a, b);
}

export class ApiKeyService {
  constructor(
    private readonly repository: IntegrationsRepository,
    private readonly identifiers: IdentifierGenerator,
    private readonly credentials: CredentialGenerator = new SecureApiKeyCredentialGenerator(),
    private readonly clock: { now(): Date } = { now: () => new Date() },
    private readonly hasher: ApiKeyHasher = new ScryptApiKeyHasher(),
  ) {}

  private async denied(actor: AuthorizedTenantActorContext, action: string, targetType = 'api_key'): Promise<Result<never, PublicErrorEnvelope>> {
    try { await this.repository.recordDenial(actor, action, targetType, this.clock.now().toISOString()); } catch { /* denial remains non-disclosing when audit storage is unavailable */ }
    return { ok: false, error: createNonDisclosingDenial(actor.requestId) };
  }
  private canManage(actor: AuthorizedTenantActorContext): boolean { return actor.permissionSet.has(INTEGRATIONS_PERMISSIONS.apiKeyManage) && (actor.regionScopeId === undefined || actor.regionScopeId === null); }
  private scopesAllowed(actor: AuthorizedTenantActorContext, scopes: readonly string[]): boolean {
    return scopes.every((scope) => actor.permissionSet.has(scope) && scope !== INTEGRATIONS_PERMISSIONS.customerAdmin && scope !== INTEGRATIONS_PERMISSIONS.superAdmin);
  }
  private async material(input: { name: string; scopes: readonly string[]; expiresAt: string | null; regionId: string | null }, actor: AuthorizedTenantActorContext, predecessorId: string | null): Promise<{ stored: NewStoredApiKey; plaintext: string }> {
    const generated = this.credentials.create(); const parsed = parseCredential(generated.plaintext);
    if (parsed === null || parsed.lookupId !== generated.lookupId) throw new Error('Credential generator returned invalid material.');
    const verificationHash = await this.hasher.hash(parsed.secret, generated.salt);
    return { plaintext: generated.plaintext, stored: { id: this.identifiers.create(), organizationId: actor.organizationId, lookupId: generated.lookupId, name: input.name, salt: generated.salt, verificationHash, scopes: input.scopes, predecessorId, expiresAt: input.expiresAt, regionId: input.regionId, now: this.clock.now().toISOString() } };
  }

  async issue(actor: AuthorizedTenantActorContext, raw: unknown): Promise<Result<IssuedApiKey, PublicErrorEnvelope>> {
    const parsed = apiKeyIssueSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: createPublicError('INVALID_INPUT', 'Please correct the API key fields.', actor.requestId) };
    if (!this.canManage(actor) || !this.scopesAllowed(actor, parsed.data.scopes)) return this.denied(actor, 'api_key.issue.denied');
    const lock = actor.regionScopeId ?? null;
    if (lock !== null && parsed.data.regionId !== null && parsed.data.regionId !== lock) {
      return { ok: false, error: createPublicError('INVALID_INPUT', 'API key region must match your locked region.', actor.requestId) };
    }
    if (parsed.data.expiresAt !== null && new Date(parsed.data.expiresAt) <= this.clock.now()) return { ok: false, error: createPublicError('INVALID_INPUT', 'API key expiry must be in the future.', actor.requestId, { expiresAt: ['Expiry must be in the future.'] }) };
    try {
      const material = await this.material({ ...parsed.data, regionId: lock ?? parsed.data.regionId }, actor, null);
      const key = await this.repository.createApiKey(actor, material.stored);
      return { ok: true, value: Object.freeze({ key, plaintext: material.plaintext }) };
    } catch (error) {
      if (error instanceof IntegrationsAccessDeniedError) return this.denied(actor, 'api_key.issue.denied');
      if (error instanceof IntegrationsSubscriptionInactiveError) return { ok: false, error: createPublicError('FORBIDDEN', 'Langganan tidak aktif. Hubungi administrator agar dapat menerbitkan API key.', actor.requestId) };
      if (error instanceof IntegrationsConflictError) return { ok: false, error: createPublicError('CONFLICT', 'The API key could not be issued.', actor.requestId) };
      return { ok: false, error: createPublicError('DEPENDENCY_UNAVAILABLE', 'The API key could not be issued.', actor.requestId) };
    }
  }

  async authenticate(plaintext: string, requiredScope?: string, requestId = crypto.randomUUID()): Promise<Result<AuthorizedTenantActorContext, PublicErrorEnvelope>> {
    const parsed = parseCredential(plaintext);
    if (parsed === null) return { ok: false, error: createNonDisclosingDenial(requestId) };
    try {
      const stored = await this.repository.findApiKeyByLookupId(parsed.lookupId);
      if (stored === null) return { ok: false, error: createNonDisclosingDenial(requestId) };
      const validHash = await this.hasher.verify(parsed.secret, stored.salt, stored.verificationHash);
      const active = stored.status === 'active' && (stored.expiresAt === null || new Date(stored.expiresAt) > this.clock.now());
      if (!validHash || !active) return { ok: false, error: createNonDisclosingDenial(requestId) };
      const actor: AuthorizedTenantActorContext = Object.freeze({ actorType: 'api_key', actorId: stored.id, organizationId: stored.organizationId, permissionSet: new Set(stored.scopes), regionScopeId: stored.regionId, entryPoint: 'api', requestId });
      if (requiredScope !== undefined && !stored.scopes.includes(requiredScope)) return this.denied(actor, 'api_key.authenticate.scope.denied');
      await this.repository.recordApiKeyUse(stored.organizationId, stored.id, this.clock.now().toISOString());
      return { ok: true, value: actor };
    } catch { return { ok: false, error: createPublicError('DEPENDENCY_UNAVAILABLE', 'Authentication is temporarily unavailable.', requestId) }; }
  }

  async rotate(actor: AuthorizedTenantActorContext, raw: unknown): Promise<Result<IssuedApiKey, PublicErrorEnvelope>> {
    const parsed = apiKeyRotateSchema.safeParse(raw); if (!parsed.success) return { ok: false, error: createPublicError('INVALID_INPUT', 'Invalid API key rotation.', actor.requestId) };
    if (!this.canManage(actor)) return this.denied(actor, 'api_key.rotate.denied');
    try {
      const current = (await this.repository.listApiKeys(actor)).find(({ id }) => id === parsed.data.apiKeyId);
      if (current === undefined || current.status !== 'active') return this.denied(actor, 'api_key.rotate.denied');
      const lock = actor.regionScopeId ?? null;
      if (lock !== null && current.regionId !== lock) return this.denied(actor, 'api_key.rotate.denied');
      const next = { name: parsed.data.name ?? current.name, scopes: parsed.data.scopes ?? current.scopes, expiresAt: parsed.data.expiresAt === undefined ? current.expiresAt : parsed.data.expiresAt, regionId: current.regionId };
      if (!this.scopesAllowed(actor, next.scopes)) return this.denied(actor, 'api_key.rotate.denied');
      const material = await this.material(next, actor, current.id);
      const key = await this.repository.rotateApiKey(actor, current.id, parsed.data.expectedVersion, material.stored);
      return { ok: true, value: Object.freeze({ key, plaintext: material.plaintext }) };
    } catch (error) {
      if (error instanceof IntegrationsAccessDeniedError) return this.denied(actor, 'api_key.rotate.denied');
      if (error instanceof IntegrationsSubscriptionInactiveError) return { ok: false, error: createPublicError('FORBIDDEN', 'Langganan tidak aktif. Hubungi administrator agar dapat merotasi API key.', actor.requestId) };
      if (error instanceof IntegrationsConflictError) return { ok: false, error: createPublicError('CONFLICT', 'The API key changed before rotation.', actor.requestId) };
      return { ok: false, error: createPublicError('DEPENDENCY_UNAVAILABLE', 'The API key could not be rotated.', actor.requestId) };
    }
  }

  async revoke(actor: AuthorizedTenantActorContext, raw: unknown): Promise<Result<ApiKeyRecord, PublicErrorEnvelope>> {
    const parsed = apiKeyRevokeSchema.safeParse(raw); if (!parsed.success) return { ok: false, error: createPublicError('INVALID_INPUT', 'Invalid API key revocation.', actor.requestId) };
    if (!this.canManage(actor)) return this.denied(actor, 'api_key.revoke.denied');
    try { return { ok: true, value: await this.repository.revokeApiKey(actor, parsed.data.apiKeyId, parsed.data.expectedVersion, this.clock.now().toISOString()) }; }
    catch (error) { return error instanceof IntegrationsAccessDeniedError ? this.denied(actor, 'api_key.revoke.denied') : error instanceof IntegrationsConflictError ? { ok: false, error: createPublicError('CONFLICT', 'The API key changed before revocation.', actor.requestId) } : { ok: false, error: createPublicError('DEPENDENCY_UNAVAILABLE', 'The API key could not be revoked.', actor.requestId) }; }
  }

  async list(actor: AuthorizedTenantActorContext): Promise<Result<readonly ApiKeyRecord[], PublicErrorEnvelope>> {
    if (actor.regionScopeId !== undefined && actor.regionScopeId !== null) return this.denied(actor, 'api_key.list.denied');
    if (!actor.permissionSet.has(INTEGRATIONS_PERMISSIONS.apiKeyRead) && !this.canManage(actor)) return this.denied(actor, 'api_key.list.denied');
    try { return { ok: true, value: await this.repository.listApiKeys(actor) }; } catch (error) { return error instanceof IntegrationsAccessDeniedError ? this.denied(actor, 'api_key.list.denied') : { ok: false, error: createPublicError('DEPENDENCY_UNAVAILABLE', 'API keys are temporarily unavailable.', actor.requestId) }; }
  }
}