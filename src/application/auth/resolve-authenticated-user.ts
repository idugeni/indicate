import type { LocalUserIdentity } from '@/domain/authorization/rbac';
import type { AccessibleOrganization, AuthorizationRepository } from '@/ports/authorization-repository';
import type { IdentifierGenerator } from '@/ports/identifier-generator';
import type { SupabaseAuthPort } from '@/ports/supabase';
import type { Result } from '@/shared/types/result';

export type AuthenticationFailure = 'UNAUTHENTICATED' | 'IDENTITY_UNAVAILABLE';

export async function resolveVerifiedLocalUser(
  identity: { readonly authUserId: string; readonly displayName: string },
  repository: AuthorizationRepository,
  identifiers: IdentifierGenerator,
): Promise<Result<LocalUserIdentity, 'IDENTITY_UNAVAILABLE'>> {
  const existing = await repository.findLocalUserByAuthIdentity(identity.authUserId);
  const localUser = existing ?? await repository.linkLocalUser({
    id: identifiers.create(),
    authUserId: identity.authUserId,
    displayName: identity.displayName,
  });
  return localUser.status === 'active'
    ? { ok: true, value: localUser }
    : { ok: false, error: 'IDENTITY_UNAVAILABLE' };
}

export async function resolveVerifiedUserOrganizations(
  identity: { readonly authUserId: string; readonly displayName: string },
  repository: AuthorizationRepository,
  identifiers: IdentifierGenerator,
): Promise<Result<{ readonly localUser: LocalUserIdentity; readonly organizations: readonly AccessibleOrganization[] }, 'IDENTITY_UNAVAILABLE'>> {
  const localUser = await resolveVerifiedLocalUser(identity, repository, identifiers);
  if (!localUser.ok) return localUser;
  const organizations = await repository.listActiveOrganizationsForUser(identity.authUserId);
  return { ok: true, value: Object.freeze({ localUser: localUser.value, organizations }) };
}

export async function resolveAuthenticatedUser(
  sessionToken: string,
  auth: SupabaseAuthPort,
  repository: AuthorizationRepository,
  identifiers: IdentifierGenerator,
): Promise<Result<LocalUserIdentity, AuthenticationFailure>> {
  if (!sessionToken) return { ok: false, error: 'UNAUTHENTICATED' };
  const identity = await auth.verifySession(sessionToken);
  if (identity === null) return { ok: false, error: 'UNAUTHENTICATED' };
  return resolveVerifiedLocalUser(identity, repository, identifiers);
}
