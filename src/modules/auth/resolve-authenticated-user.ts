import type { LocalUserIdentity } from '@/modules/auth/rbac';
import type { AccessibleOrganization, AuthorizationRepository } from '@/modules/auth/ports';
import type { IdentifierGenerator } from '@/core/system/ports';
import type { Result } from '@/core/result';

export async function resolveVerifiedLocalUser(
  identity: { readonly authUserId: string; readonly displayName: string; readonly avatarUrl: string | null; readonly email: string | null },
  repository: AuthorizationRepository,
  identifiers: IdentifierGenerator,
): Promise<Result<LocalUserIdentity, 'IDENTITY_UNAVAILABLE'>> {
  const existing = await repository.findLocalUserByAuthIdentity(identity.authUserId);
  const localUser = existing ?? await repository.linkLocalUser({
    id: identifiers.create(),
    authUserId: identity.authUserId,
    displayName: identity.displayName,
    avatarUrl: identity.avatarUrl,
    email: identity.email,
  });
  return localUser.status === 'active'
    ? { ok: true, value: localUser }
    : { ok: false, error: 'IDENTITY_UNAVAILABLE' };
}

export async function resolveVerifiedUserOrganizations(
  identity: { readonly authUserId: string; readonly displayName: string; readonly avatarUrl: string | null; readonly email: string | null },
  repository: AuthorizationRepository,
  identifiers: IdentifierGenerator,
): Promise<Result<{ readonly localUser: LocalUserIdentity; readonly organizations: readonly AccessibleOrganization[] }, 'IDENTITY_UNAVAILABLE'>> {
  const localUser = await resolveVerifiedLocalUser(identity, repository, identifiers);
  if (!localUser.ok) return localUser;
  const organizations = await repository.listActiveOrganizationsForUser(identity.authUserId);
  return { ok: true, value: Object.freeze({ localUser: localUser.value, organizations }) };
}
