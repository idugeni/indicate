import { promisify } from 'node:util';
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

import type { AuthorizedTenantActorContext } from '@/core/operation-context';
import type { IdentifierGenerator } from '@/core/system/ports';
import type { Result } from '@/core/result';
import { createNonDisclosingDenial, createPublicError, type PublicErrorEnvelope } from '@/core/errors';
import { INTEGRATIONS_PERMISSIONS } from '@/modules/integrations/permissions';
import type { IssuedAccessKey, StoredAccessKey, AccessKeyRecord } from '@/modules/auth/dashboard-access-keys/models';
import { accessKeyIssueSchema, accessKeyRevokeSchema } from '@/modules/auth/dashboard-access-keys/schemas';

const derive = promisify(scrypt);
const PREFIX = 'inda';
const HASH_BYTES = 64;
const MAX_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface AccessKeyCredentialMaterial {
  readonly plaintext: string;
  readonly lookupId: string;
  readonly salt: string;
}

export interface NewStoredAccessKey {
  readonly id: string;
  readonly organizationId: string;
  readonly userId: string;
  readonly lookupId: string;
  readonly name: string;
  readonly salt: string;
  readonly verificationHash: string;
  readonly expiresAt: string | null;
  readonly now: string;
}

export interface AccessKeyRepository {
  createAccessKey(actor: AuthorizedTenantActorContext, input: NewStoredAccessKey): Promise<AccessKeyRecord>;
  revokeAccessKey(actor: AuthorizedTenantActorContext, id: string, expectedVersion: number, now: string): Promise<AccessKeyRecord>;
  listAccessKeys(actor: AuthorizedTenantActorContext): Promise<readonly AccessKeyRecord[]>;
  findAccessKeyByLookupId(lookupId: string): Promise<StoredAccessKey | null>;
  recordAccessKeyUse(organizationId: string, id: string, now: string): Promise<void>;
  recordDenial(actor: AuthorizedTenantActorContext, action: string, targetType: string, now: string): Promise<void>;
}

export class AccessKeyCompromisedError extends Error {}
export class AccessKeyConflictError extends Error {}

const base64url = (value: Uint8Array) => Buffer.from(value).toString('base64url');

/**
 * Mint a fresh lookup + secret pair for one dashboard access key.
 *
 * @returns Plaintext credential plus its lookup id and salt; the hash is derived by the service.
 */
export function createAccessKeyMaterial(): AccessKeyCredentialMaterial {
  const lookupId = base64url(randomBytes(12));
  const secret = base64url(randomBytes(32));
  return {
    plaintext: `${PREFIX}_${lookupId}.${secret}`,
    lookupId,
    salt: randomBytes(16).toString('base64'),
  };
}

/**
 * Split a presented access-key credential into its lookup and secret parts.
 *
 * @param plaintext - Raw credential from the URL or cookie.
 * @returns Lookup and secret halves, or null when the shape is invalid.
 */
export function parseAccessKeyCredential(plaintext: string): { lookupId: string; secret: string } | null {
  const match = /^inda_([A-Za-z0-9_-]{16})\.([A-Za-z0-9_-]{43})$/.exec(plaintext);
  return match === null ? null : { lookupId: match[1]!, secret: match[2]! };
}

/**
 * Derive the scrypt verification hash for an access-key secret.
 *
 * @param secret - Secret half of the credential.
 * @param salt - Per-key salt stored alongside the row.
 * @returns Base64 verification hash.
 */
export async function deriveAccessKeyHash(secret: string, salt: string): Promise<string> {
  const derived = (await derive(secret, Buffer.from(salt, 'base64'), HASH_BYTES)) as ArrayBuffer;
  return Buffer.from(derived).toString('base64');
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left, 'base64');
  const b = Buffer.from(right, 'base64');
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Verify a presented secret against its stored hash without leaking timing.
 *
 * @param secret - Secret half of the presented credential.
 * @param salt - Stored per-key salt.
 * @param expectedHash - Stored verification hash.
 * @returns True when the secret matches.
 */
export async function verifyAccessKeySecret(secret: string, salt: string, expectedHash: string): Promise<boolean> {
  return safeEqual(await deriveAccessKeyHash(secret, salt), expectedHash);
}

/**
 * Build the one-time redeem path for a freshly issued access key.
 *
 * @param plaintext - Full credential shown once at issuance.
 * @returns Relative URL the owner bookmarks or opens to skip login.
 */
export function accessKeyLoginPath(plaintext: string): string {
  return `/auth/access-key?key=${encodeURIComponent(plaintext)}`;
}

export class DashboardAccessKeyService {
  constructor(
    private readonly repository: AccessKeyRepository,
    private readonly identifiers: IdentifierGenerator,
    private readonly clock: { now(): Date } = { now: () => new Date() },
  ) {}

  private async denied(actor: AuthorizedTenantActorContext, action: string): Promise<Result<never, PublicErrorEnvelope>> {
    try {
      await this.repository.recordDenial(actor, action, 'access_key', this.clock.now().toISOString());
    } catch {
      /* Denial stays non-disclosing when audit storage is unavailable. */
    }
    return { ok: false, error: createNonDisclosingDenial(actor.requestId) };
  }

  private canManage(actor: AuthorizedTenantActorContext): boolean {
    return (
      actor.permissionSet.has(INTEGRATIONS_PERMISSIONS.apiKeyManage) &&
      (actor.regionScopeId === undefined || actor.regionScopeId === null)
    );
  }

  private expiryFor(raw: string | null): Result<string, PublicErrorEnvelope> | null {
    const now = this.clock.now().getTime();
    if (raw === null) return { ok: true, value: new Date(now + MAX_TTL_MS).toISOString() };
    const at = new Date(raw).getTime();
    if (!Number.isFinite(at)) return null;
    return { ok: true, value: new Date(at).toISOString() };
  }

  /**
   * Issue a reusable login key bound to the issuing member.
   *
   * @param actor - Authorized dashboard actor performing the issuance.
   * @param localUserId - Local user id the key authenticates as.
   * @param raw - Untrusted issuance payload.
   * @returns Issued key with its once-visible plaintext credential.
   */
  async issue(
    actor: AuthorizedTenantActorContext,
    localUserId: string,
    raw: unknown,
  ): Promise<Result<IssuedAccessKey, PublicErrorEnvelope>> {
    const parsed = accessKeyIssueSchema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, error: createPublicError('INVALID_INPUT', 'Periksa kembali nama dan masa berlaku kunci.', actor.requestId) };
    }
    if (!this.canManage(actor)) return this.denied(actor, 'access_key.issue.denied');
    const now = this.clock.now();
    let expiresAt: string;
    if (parsed.data.expiresAt === null) {
      expiresAt = new Date(now.getTime() + MAX_TTL_MS).toISOString();
    } else {
      const at = new Date(parsed.data.expiresAt).getTime();
      if (!Number.isFinite(at) || at <= now.getTime()) {
        return {
          ok: false,
          error: createPublicError('INVALID_INPUT', 'Masa berlaku harus di masa depan.', actor.requestId, {
            expiresAt: ['Expiry must be in the future.'],
          }),
        };
      }
      if (at - now.getTime() > MAX_TTL_MS) {
        return {
          ok: false,
          error: createPublicError('INVALID_INPUT', 'Masa berlaku maksimal 30 hari.', actor.requestId, {
            expiresAt: ['Expiry must be within 30 days.'],
          }),
        };
      }
      expiresAt = new Date(at).toISOString();
    }
    try {
      const material = createAccessKeyMaterial();
      const check = this.expiryFor(expiresAt);
      if (check === null || !check.ok) {
        return { ok: false, error: createPublicError('INVALID_INPUT', 'Masa berlaku tidak valid.', actor.requestId) };
      }
      const stored: NewStoredAccessKey = {
        id: this.identifiers.create(),
        organizationId: actor.organizationId,
        userId: localUserId,
        lookupId: material.lookupId,
        name: parsed.data.name,
        salt: material.salt,
        verificationHash: await deriveAccessKeyHash(parseAccessKeyCredential(material.plaintext)!.secret, material.salt),
        expiresAt: check.value,
        now: now.toISOString(),
      };
      const key = await this.repository.createAccessKey(actor, stored);
      return { ok: true, value: Object.freeze({ key, plaintext: material.plaintext }) };
    } catch (error) {
      if (error instanceof AccessKeyConflictError) {
        return { ok: false, error: createPublicError('CONFLICT', 'Kunci akses gagal diterbitkan.', actor.requestId) };
      }
      return { ok: false, error: createPublicError('DEPENDENCY_UNAVAILABLE', 'Kunci akses gagal diterbitkan.', actor.requestId) };
    }
  }

  /**
   * List reusable login keys for one organization.
   *
   * @param actor - Authorized dashboard actor.
   * @returns Key projections without secret material.
   */
  async list(actor: AuthorizedTenantActorContext): Promise<Result<readonly AccessKeyRecord[], PublicErrorEnvelope>> {
    if (actor.regionScopeId !== undefined && actor.regionScopeId !== null) return this.denied(actor, 'access_key.list.denied');
    if (!actor.permissionSet.has(INTEGRATIONS_PERMISSIONS.apiKeyRead) && !this.canManage(actor)) {
      return this.denied(actor, 'access_key.list.denied');
    }
    try {
      return { ok: true, value: await this.repository.listAccessKeys(actor) };
    } catch {
      return { ok: false, error: createPublicError('DEPENDENCY_UNAVAILABLE', 'Kunci akses sementara tidak tersedia.', actor.requestId) };
    }
  }

  /**
   * Revoke a reusable login key so its link stops working immediately.
   *
   * @param actor - Authorized dashboard actor.
   * @param raw - Untrusted revocation payload.
   * @returns Updated key projection.
   */
  async revoke(actor: AuthorizedTenantActorContext, raw: unknown): Promise<Result<AccessKeyRecord, PublicErrorEnvelope>> {
    const parsed = accessKeyRevokeSchema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, error: createPublicError('INVALID_INPUT', 'Permintaan revoke tidak valid.', actor.requestId) };
    }
    if (!this.canManage(actor)) return this.denied(actor, 'access_key.revoke.denied');
    try {
      return {
        ok: true,
        value: await this.repository.revokeAccessKey(actor, parsed.data.accessKeyId, parsed.data.expectedVersion, this.clock.now().toISOString()),
      };
    } catch (error) {
      if (error instanceof AccessKeyCompromisedError) return this.denied(actor, 'access_key.revoke.denied');
      if (error instanceof AccessKeyConflictError) {
        return { ok: false, error: createPublicError('CONFLICT', 'Kunci berubah sebelum revoke.', actor.requestId) };
      }
      return { ok: false, error: createPublicError('DEPENDENCY_UNAVAILABLE', 'Kunci akses gagal dicabut.', actor.requestId) };
    }
  }

  /**
   * Authenticate a presented credential without revealing which check failed.
   *
   * @param plaintext - Raw credential from the URL or cookie.
   * @param requestId - Correlation id for the non-disclosing denial.
   * @returns Stored row when the secret is valid, live, and unexpired.
   */
  async authenticate(plaintext: string, requestId: string): Promise<Result<StoredAccessKey, PublicErrorEnvelope>> {
    const parsed = parseAccessKeyCredential(plaintext);
    if (parsed === null) return { ok: false, error: createNonDisclosingDenial(requestId) };
    try {
      const stored = await this.repository.findAccessKeyByLookupId(parsed.lookupId);
      if (stored === null) return { ok: false, error: createNonDisclosingDenial(requestId) };
      const live = stored.status === 'active' && (stored.expiresAt === null || new Date(stored.expiresAt).getTime() > this.clock.now().getTime());
      const valid = await verifyAccessKeySecret(parsed.secret, stored.salt, stored.verificationHash);
      if (!valid || !live) return { ok: false, error: createNonDisclosingDenial(requestId) };
      return { ok: true, value: stored };
    } catch {
      return { ok: false, error: createPublicError('DEPENDENCY_UNAVAILABLE', 'Authentication is temporarily unavailable.', requestId) };
    }
  }
}
