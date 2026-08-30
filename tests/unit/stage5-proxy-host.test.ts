import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it } from 'vitest';
import { proxy } from '@/proxy';

const original = {
  NODE_ENV: process.env.NODE_ENV,
  APP_ENVIRONMENT: process.env.APP_ENVIRONMENT,
  MVP_ROOT_HOSTS: process.env.MVP_ROOT_HOSTS,
  CMS_HOST: process.env.CMS_HOST,
};
afterEach(() => { Object.assign(process.env, original); });
describe('Stage 5 production Host handling', () => {
  it('does not rewrite localhost to the CMS host in production', () => {
    Object.assign(process.env, { NODE_ENV: 'production', APP_ENVIRONMENT: 'production' });
    const response = proxy(new NextRequest('https://localhost/cms', { headers: { host: 'localhost' } }));
    expect(response.status).toBe(400);
  });

  it('ignores forwarded and former test-host override headers', () => {
    Object.assign(process.env, { NODE_ENV: 'test', APP_ENVIRONMENT: 'test' });
    const response = proxy(new NextRequest('https://api.indicate.web.id/cms', { headers: { host: 'api.indicate.web.id', 'x-indicate-test-host': 'indicate.web.id', 'x-forwarded-host': 'indicate.web.id' } }));
    expect(response.status).toBe(404);
  });

  it('binds the internal reconciler to the CMS control-plane host', () => {
    Object.assign(process.env, {
      NODE_ENV: 'production',
      APP_ENVIRONMENT: 'production',
      CMS_HOST: 'indicate.web.id',
    });

    expect(proxy(new NextRequest('https://indicate.web.id/api/internal/stage5/reconcile', { headers: { host: 'indicate.web.id' } })).status).toBe(200);
    const publicHost = proxy(new NextRequest('https://alpha.example.web.id/api/internal/stage5/reconcile', { headers: { host: 'alpha.example.web.id' } }));
    expect(publicHost.status).toBe(404);
    expect(publicHost.headers.get('x-robots-tag')).toBe('noindex, nofollow');
  });

  it('allows configured test roots and one regional label while rejecting unknown hosts as nonindexable', () => {
    Object.assign(process.env, {
      NODE_ENV: 'test',
      APP_ENVIRONMENT: 'test',
      MVP_ROOT_HOSTS: 'alpha.example.web.id,beta.example.web.id,gamma.example.web.id',
    });

    expect(proxy(new NextRequest('https://alpha.example.web.id/', { headers: { host: 'alpha.example.web.id' } })).status).toBe(200);
    expect(proxy(new NextRequest('https://wonosobo.alpha.example.web.id/', { headers: { host: 'wonosobo.alpha.example.web.id' } })).status).toBe(200);

    const unknown = proxy(new NextRequest('https://unknown.example.web.id/', { headers: { host: 'unknown.example.web.id' } }));
    expect(unknown.status).toBe(404);
    expect(unknown.headers.get('x-robots-tag')).toBe('noindex, nofollow');
  });
});
