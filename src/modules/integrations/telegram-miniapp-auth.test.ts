import { describe, expect, it } from 'vitest';

import { authorizeMiniAppOwner, verifyMiniAppInitData } from '@/modules/integrations/telegram-miniapp-auth';

const BOT_TOKEN = 'test-bot-token-12345678901234567890';
const USER_JSON = '{"id":111222333,"first_name":"Owner","username":"owner","language_code":"id"}';
const AUTH_DATE = 1789850400;
const QUERY_ID = 'AAHdF6IQAAAAAN0XohAS6R8c';
const HASH = '00a538d1e34fcf2250bf2e2eb561b2d73d0d4ac5a5c97966c6739458f73dc077';

function initDataOf(userJson: string, hash: string = HASH): string {
  const params = new URLSearchParams({ auth_date: String(AUTH_DATE), query_id: QUERY_ID, user: userJson, hash });
  return params.toString();
}

const VALID = initDataOf(USER_JSON);
const ORG_ID = '0e9b4c1a-2b3c-4d5e-8f60-7a8b9c0d1e2f';

describe('verifyMiniAppInitData', () => {
  it('menerima vektor valid telegram', () => {
    expect(verifyMiniAppInitData(BOT_TOKEN, VALID, AUTH_DATE + 60)).toEqual({
      telegramUserId: '111222333',
      firstName: 'Owner',
      username: 'owner',
      authDateSeconds: AUTH_DATE,
    });
  });

  it('menolak data yang diubah, token salah, dan tanpa hash', () => {
    expect(verifyMiniAppInitData(BOT_TOKEN, initDataOf(USER_JSON.replace('Owner', 'Hacker')), AUTH_DATE + 60)).toBe(null);
    expect(verifyMiniAppInitData('token-salah-12345678901234567890', VALID, AUTH_DATE + 60)).toBe(null);
    expect(verifyMiniAppInitData(BOT_TOKEN, 'auth_date=1&user={}', AUTH_DATE + 60)).toBe(null);
    expect(verifyMiniAppInitData('', VALID, AUTH_DATE + 60)).toBe(null);
  });

  it('menolak init data basi dan dari masa depan', () => {
    expect(verifyMiniAppInitData(BOT_TOKEN, VALID, AUTH_DATE + 86_401)).toBe(null);
    expect(verifyMiniAppInitData(BOT_TOKEN, VALID, AUTH_DATE - 1)).toBe(null);
  });
});

describe('authorizeMiniAppOwner', () => {
  it('membangun aktor pemilik untuk satu organisasi', () => {
    const result = authorizeMiniAppOwner({
      botToken: BOT_TOKEN, ownerIds: ['111222333'], initData: VALID,
      organizationId: ORG_ID, requestId: 'req-1', nowSeconds: AUTH_DATE + 60,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.value.telegramUserId).toBe('111222333');
    expect(result.value.actor).toMatchObject({ actorType: 'telegram', organizationId: ORG_ID, entryPoint: 'telegram' });
    expect(result.value.actor.permissionSet.has('article.manage')).toBe(true);
    expect(result.value.actor.platformPermissionSet?.has('platform.super_admin')).toBe(true);
  });

  it('menolak non-pemilik, allowlist kosong, org buruk, dan init basi', () => {
    const base = {
      botToken: BOT_TOKEN, ownerIds: ['999'], initData: VALID,
      organizationId: ORG_ID, requestId: 'req-1', nowSeconds: AUTH_DATE + 60,
    };
    expect(authorizeMiniAppOwner(base).ok).toBe(false);
    expect(authorizeMiniAppOwner({ ...base, ownerIds: [] }).ok).toBe(false);
    expect(authorizeMiniAppOwner({ ...base, ownerIds: ['111222333'], organizationId: 'bukan-uuid' }).ok).toBe(false);
    expect(authorizeMiniAppOwner({ ...base, ownerIds: ['111222333'], nowSeconds: AUTH_DATE + 90_000 }).ok).toBe(false);
  });
});
