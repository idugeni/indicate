import { describe, expect, it, vi } from 'vitest';

import { resolveVerifiedLocalUser, resolveVerifiedUserOrganizations } from '@/modules/auth/resolve-authenticated-user';

const identity = { authUserId: 'auth-1', displayName: 'Operator', avatarUrl: null, email: 'op@example.test' };
const activeUser = { id: 'user-1', authUserId: 'auth-1', displayName: 'Operator', avatarUrl: null, status: 'active' } as const;

function harness(find: unknown, listOrgs: unknown = []) {
  const repository = {
    findLocalUserByAuthIdentity: vi.fn(async () => find),
    linkLocalUser: vi.fn(async (input: unknown) => ({ ...(input as object), status: 'active' })),
    listActiveOrganizationsForUser: vi.fn(async () => listOrgs),
  };
  const identifiers = { create: () => 'user-9' };
  return { repository, identifiers };
}

describe('resolveVerifiedLocalUser', () => {
  it('mengembalikan user lokal aktif yang sudah ada', async () => {
    const { repository, identifiers } = harness(activeUser);
    const result = await resolveVerifiedLocalUser(identity, repository as never, identifiers);
    expect(result).toEqual({ ok: true, value: activeUser });
    expect(repository.linkLocalUser).not.toHaveBeenCalled();
  });

  it('menautkan user baru bila belum ada', async () => {
    const { repository, identifiers } = harness(null);
    const result = await resolveVerifiedLocalUser(identity, repository as never, identifiers);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.value.id).toBe('user-9');
    expect(repository.findLocalUserByAuthIdentity).toHaveBeenCalledWith('auth-1');
  });

  it('menolak user nonaktif sebagai identity unavailable', async () => {
    const { identifiers } = harness({ ...activeUser, status: 'archived' });
    const existing = await resolveVerifiedLocalUser(identity, harness({ ...activeUser, status: 'archived' }).repository as never, identifiers);
    expect(existing).toEqual({ ok: false, error: 'IDENTITY_UNAVAILABLE' });
  });
});

describe('resolveVerifiedUserOrganizations', () => {
  it('menggabungkan user dan organisasi aktif', async () => {
    const orgs = [{ id: 'org-1' }];
    const { repository, identifiers } = harness(activeUser, orgs);
    const result = await resolveVerifiedUserOrganizations(identity, repository as never, identifiers);
    expect(result).toEqual({ ok: true, value: { localUser: activeUser, organizations: orgs } });
  });

  it('meneruskan kegagalan identitas', async () => {
    const { repository, identifiers } = harness({ ...activeUser, status: 'inactive' });
    const result = await resolveVerifiedUserOrganizations(identity, repository as never, identifiers);
    expect(result).toEqual({ ok: false, error: 'IDENTITY_UNAVAILABLE' });
  });
});
