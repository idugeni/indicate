import 'server-only';

import { neonAuth } from '@/integrations/neon-auth/server';

export interface VerifiedAuthIdentity {
  readonly authUserId: string;
  readonly displayName: string;
  readonly avatarUrl: string | null;
  readonly email: string | null;
}

/**
 * Read the signed Neon Managed Auth session on the server.
 * This only establishes the provider identity; application authorization is
 * still resolved against the local user, active tenant membership, and RBAC.
 */
export async function getVerifiedNeonIdentity(): Promise<VerifiedAuthIdentity | null> {
  try {
    const { data: session, error } = await neonAuth.getSession();
    const user = session?.user;
    if (error || user == null || typeof user.id !== 'string' || user.id.length === 0) return null;

    const email = typeof user.email === 'string' && user.email.length > 0 ? user.email : null;
    const rawName = typeof user.name === 'string' ? user.name.trim() : '';
    const displayName = (rawName || email?.split('@')[0] || 'Indicate User').slice(0, 200);
    const rawAvatar = typeof user.image === 'string' ? user.image.trim() : '';
    const avatarUrl = /^https:\/\//iu.test(rawAvatar) && rawAvatar.length <= 2000 ? rawAvatar : null;

    return Object.freeze({
      authUserId: user.id,
      displayName,
      avatarUrl,
      email,
    });
  } catch {
    return null;
  }
}
