import { createHmac, timingSafeEqual } from 'node:crypto';

import type { AuthorizedTenantActorContext } from '@/core/operation-context';
import { createNonDisclosingDenial, type PublicErrorEnvelope } from '@/core/errors';
import type { Result } from '@/core/result';
import { SOLO_ADMIN_PERMISSION_NAMES } from '@/modules/dashboard/permissions';
import { INTEGRATIONS_PERMISSIONS } from '@/modules/integrations/permissions';

export interface MiniAppPrincipal {
  readonly telegramUserId: string;
  readonly firstName: string | null;
  readonly username: string | null;
  readonly authDateSeconds: number;
}

const MINI_APP_AUTH_MAX_AGE_SECONDS = 86_400;

function safeEqualHex(left: string, right: string): boolean {
  const a = Buffer.from(left, 'utf8');
  const b = Buffer.from(right, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Verifies Telegram Mini App init data authenticity and freshness.
 *
 * @param botToken - Bot token used as the HMAC key derivation input.
 * @param initData - Raw init data string delivered by the Telegram client.
 * @param nowSeconds - Current time in whole seconds for the freshness check.
 * @param maxAgeSeconds - Maximum accepted init data age; defaults to one day.
 * @returns The authenticated principal, or null when the signature, shape,
 * or freshness check fails.
 * @remarks
 * Follows the Telegram Web App validation recipe: the `hash` parameter is
 * excluded, remaining pairs are sorted and newline-joined, and the digest
 * key is `HMAC_SHA256("WebAppData", botToken)`. Never trust `user.id`
 * without this check — init data is client-supplied and trivially forged.
 */
export function verifyMiniAppInitData(botToken: string, initData: string, nowSeconds: number, maxAgeSeconds: number = MINI_APP_AUTH_MAX_AGE_SECONDS): MiniAppPrincipal | null {
  if (botToken === '' || initData === '') return null;
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(initData);
  } catch {
    return null;
  }
  const received = params.get('hash');
  if (received === null || received === '') return null;
  const authDate = Number(params.get('auth_date'));
  if (!Number.isInteger(authDate) || authDate > nowSeconds || nowSeconds - authDate > maxAgeSeconds) return null;
  const pairs: string[] = [];
  for (const [key, value] of params) {
    if (key === 'hash') continue;
    pairs.push(`${key}=${value}`);
  }
  pairs.sort();
  const secret = createHmac('sha256', 'WebAppData').update(botToken, 'utf8').digest();
  const expected = createHmac('sha256', secret).update(pairs.join('\n'), 'utf8').digest('hex');
  if (!safeEqualHex(expected, received.toLowerCase())) return null;
  let user: unknown;
  try {
    user = JSON.parse(params.get('user') ?? 'null');
  } catch {
    return null;
  }
  const id = typeof (user as { id?: unknown } | null)?.id === 'number' ? (user as { id: number }).id : null;
  if (id === null || !Number.isInteger(id) || id <= 0) return null;
  const profile = (user as { first_name?: unknown; username?: unknown } | null) ?? null;
  return {
    telegramUserId: String(id),
    firstName: typeof profile?.first_name === 'string' ? profile.first_name : null,
    username: typeof profile?.username === 'string' ? profile.username : null,
    authDateSeconds: authDate,
  };
}

export interface MiniAppOwnerContext {
  readonly actor: AuthorizedTenantActorContext;
  readonly telegramUserId: string;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

/**
 * Authorizes a Mini App caller as the instance owner for one organization.
 *
 * @param input - Bot token, configured owner IDs, raw init data, target
 * organization, request ID, and clock.
 * @returns An owner actor scoped to the organization, or a non-disclosing
 * denial when the signature is invalid, stale, or outside the allowlist.
 * @remarks
 * Ownership is allowlist-only: no org mapping is required or consulted.
 * The actor carries the full editorial permission template plus the
 * platform super-admin grant, so every organization becomes operable.
 * Every route must call this before touching any service.
 */
export function authorizeMiniAppOwner(input: {
  readonly botToken: string;
  readonly ownerIds: readonly string[];
  readonly initData: string;
  readonly organizationId: string;
  readonly requestId: string;
  readonly nowSeconds: number;
}): Result<MiniAppOwnerContext, PublicErrorEnvelope> {
  const deny = { ok: false as const, error: createNonDisclosingDenial(input.requestId) };
  if (input.ownerIds.length === 0 || !UUID_PATTERN.test(input.organizationId)) return deny;
  const principal = verifyMiniAppInitData(input.botToken, input.initData, input.nowSeconds);
  if (principal === null || !input.ownerIds.includes(principal.telegramUserId)) return deny;
  return {
    ok: true as const,
    value: {
      actor: {
        actorType: 'telegram',
        actorId: `miniapp-owner:${principal.telegramUserId}`,
        organizationId: input.organizationId,
        permissionSet: new Set(SOLO_ADMIN_PERMISSION_NAMES),
        platformPermissionSet: new Set([INTEGRATIONS_PERMISSIONS.superAdmin]),
        regionScopeId: null,
        entryPoint: 'telegram',
        requestId: input.requestId,
      },
      telegramUserId: principal.telegramUserId,
    },
  };
}
