import { beforeEach, describe, expect, it, vi } from 'vitest';

const ORG_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
const OTHER_ORG_ID = '9c858901-8a57-4791-81fe-4c455b099bc9';
const LOCAL_USER_ID = '1b4e28ba-2fa1-4d4b-883f-2f96e1d47f8c';
const DENIED_MESSAGE = 'Permintaan beralih organisasi tidak dapat diproses.';

const cookieWrites = vi.hoisted(() => [] as { name: string; value: string; options: unknown }[]);
const revalidatedTags = vi.hoisted(() => [] as { tag: string; profile: string }[]);
const revalidatedPaths = vi.hoisted(() => [] as string[]);
const recordedDenials = vi.hoisted(() => [] as { action: string; organizationId: string }[]);
const requestHeaders = vi.hoisted(() => new Map<string, string>());
const cookieJar = vi.hoisted(() => new Map<string, string>());
const cookieWriteFailure = vi.hoisted(() => ({ enabled: false }));

vi.mock('next/headers', () => ({
  headers: async () => new Headers(Object.fromEntries(requestHeaders)),
  cookies: async () => ({
    getAll: () => [...cookieJar].map(([name, value]) => ({ name, value })),
    get: (name: string) => (cookieJar.has(name) ? { name, value: cookieJar.get(name) } : undefined),
    set: (name: string, value: string, options: unknown) => {
      if (cookieWriteFailure.enabled) throw new Error('cookie ditolak');
      cookieJar.set(name, value);
      cookieWrites.push({ name, value, options });
    },
  }),
}));

vi.mock('next/cache', () => ({
  revalidateTag: (tag: string, profile: string) => { revalidatedTags.push({ tag, profile }); },
  revalidatePath: (path: string) => { revalidatedPaths.push(path); },
}));

vi.mock('@/core/config/public-config', () => ({
  getPublicConfig: () => ({
    siteUrl: 'https://indicate.website',
    supabaseUrl: 'https://proyek.supabase.co',
    supabasePublishableKey: 'publishable-test-key',
  }),
}));

vi.mock('@/core/config/runtime/runtime-context', () => ({
  getServerRuntimeContext: async () => ({ bootstrap: {} }),
}));

vi.mock('@/data/client', () => ({
  getSharedRuntimeDatabase: () => ({ db: {} }),
}));

vi.mock('@/integrations/supabase/supabase-ssr', () => ({
  createSupabaseSsrAuthAdapter: () => ({
    verifyCookieSession: async () => {
      if (requestHeaders.get('x-no-session') === '1') return null;
      return { authUserId: 'auth-1', displayName: 'Redaktur Uji', avatarUrl: null, email: 'redaktur@contoh.id' };
    },
  }),
  createHardenedSupabaseCookieStore: (writer: unknown) => writer,
}));

const membershipState = vi.hoisted(() => ({
  membership: { roleActive: true } as { roleActive: boolean } | null,
  denialFailure: false,
  identityFailure: false,
}));

vi.mock('@/data/repos/tenancy/authorization', () => ({
  DrizzleAuthorizationRepository: class {
    async findLocalUserByAuthIdentity() {
      return membershipState.identityFailure ? null : { id: LOCAL_USER_ID, authUserId: 'auth-1', displayName: 'Redaktur Uji', avatarUrl: null, email: 'redaktur@contoh.id', status: 'active' };
    }

    async linkLocalUser() {
      return { id: LOCAL_USER_ID, authUserId: 'auth-1', displayName: 'Redaktur Uji', avatarUrl: null, email: 'redaktur@contoh.id', status: 'active' };
    }

    async findActiveMembership(organizationId: string) {
      return organizationId === ORG_ID ? membershipState.membership : null;
    }
  },
}));

vi.mock('@/data/repos/dashboard', () => ({
  DrizzleDashboardRepository: class {
    async recordDenied(actor: { organizationId: string }, action: string) {
      if (membershipState.denialFailure) throw new Error('audit gagal');
      recordedDenials.push({ action, organizationId: actor.organizationId });
    }
  },
}));

const { switchActiveOrganization } = await import('@/modules/dashboard/switch-organization-action');

function formData(organizationId: string | null): FormData {
  const data = new FormData();
  if (organizationId !== null) data.set('organizationId', organizationId);
  return data;
}

function sameOriginHeaders(): void {
  requestHeaders.set('sec-fetch-site', 'same-origin');
  requestHeaders.delete('x-no-session');
}

beforeEach(() => {
  cookieWrites.length = 0;
  revalidatedTags.length = 0;
  revalidatedPaths.length = 0;
  recordedDenials.length = 0;
  cookieJar.clear();
  requestHeaders.clear();
  cookieWriteFailure.enabled = false;
  membershipState.membership = { roleActive: true };
  membershipState.denialFailure = false;
  membershipState.identityFailure = false;
  sameOriginHeaders();
});

describe('switchActiveOrganization', () => {
  it('mengalihkan organisasi dan memurnikan kedua tag org serta path dashboard', async () => {
    cookieJar.set('indicate-active-organization', OTHER_ORG_ID);
    const result = await switchActiveOrganization({ status: 'idle' }, formData(ORG_ID));

    expect(result).toEqual({ status: 'ok', organizationId: ORG_ID });
    expect(cookieWrites).toHaveLength(1);
    expect(cookieWrites[0]).toMatchObject({ name: 'indicate-active-organization', value: ORG_ID });
    expect(cookieWrites[0]?.options).toMatchObject({ httpOnly: true, sameSite: 'lax', path: '/' });
    expect(revalidatedTags).toEqual([
      { tag: `org:${OTHER_ORG_ID}`, profile: 'max' },
      { tag: `org:${ORG_ID}`, profile: 'max' },
    ]);
    expect(revalidatedPaths).toEqual(['/dashboard']);
  });

  it('tidak mengulangi tag lama saat beralih ke org yang sama', async () => {
    cookieJar.set('indicate-active-organization', ORG_ID);
    const result = await switchActiveOrganization({ status: 'idle' }, formData(ORG_ID));

    expect(result.status).toBe('ok');
    expect(revalidatedTags).toEqual([{ tag: `org:${ORG_ID}`, profile: 'max' }]);
  });

  it('menolak permintaan lintas situs sebelum menyentuh cookie', async () => {
    requestHeaders.set('sec-fetch-site', 'cross-site');
    const result = await switchActiveOrganization({ status: 'idle' }, formData(ORG_ID));

    expect(result).toEqual({ status: 'error', message: DENIED_MESSAGE });
    expect(cookieWrites).toHaveLength(0);
    expect(revalidatedPaths).toHaveLength(0);
    expect(recordedDenials).toHaveLength(0);
  });

  it('menolak organizationId yang bukan uuid tanpa membocorkan alasan', async () => {
    const result = await switchActiveOrganization({ status: 'idle' }, formData('org-bukan-uuid'));
    expect(result).toEqual({ status: 'error', message: DENIED_MESSAGE });
    expect(cookieWrites).toHaveLength(0);
  });

  it('menolak formData tanpa organizationId', async () => {
    const result = await switchActiveOrganization({ status: 'idle' }, formData(null));
    expect(result).toEqual({ status: 'error', message: DENIED_MESSAGE });
  });

  it('menolak tanpa sesi terverifikasi', async () => {
    requestHeaders.set('x-no-session', '1');
    const result = await switchActiveOrganization({ status: 'idle' }, formData(ORG_ID));
    expect(result).toEqual({ status: 'error', message: DENIED_MESSAGE });
    expect(recordedDenials).toHaveLength(0);
  });

  it('mencatat audit lalu menolak ke organisasi tanpa membership aktif', async () => {
    const result = await switchActiveOrganization({ status: 'idle' }, formData(OTHER_ORG_ID));
    expect(result).toEqual({ status: 'error', message: DENIED_MESSAGE });
    expect(recordedDenials).toEqual([{ action: 'dashboard.organization.switch', organizationId: OTHER_ORG_ID }]);
    expect(cookieWrites).toHaveLength(0);
    expect(revalidatedPaths).toHaveLength(0);
  });

  it('menolak tanpa membuka cookie saat audit penolakan gagal', async () => {
    membershipState.denialFailure = true;
    const result = await switchActiveOrganization({ status: 'idle' }, formData(OTHER_ORG_ID));
    expect(result).toEqual({ status: 'error', message: DENIED_MESSAGE });
    expect(cookieWrites).toHaveLength(0);
  });

  it('menolak saat penulisan cookie ditolak dan tidak menginvalidasi cache', async () => {
    cookieWriteFailure.enabled = true;
    const result = await switchActiveOrganization({ status: 'idle' }, formData(ORG_ID));
    expect(result).toEqual({ status: 'error', message: DENIED_MESSAGE });
    expect(revalidatedTags).toHaveLength(0);
    expect(revalidatedPaths).toHaveLength(0);
  });
});
