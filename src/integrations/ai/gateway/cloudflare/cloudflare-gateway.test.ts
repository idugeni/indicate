import { describe, expect, it } from 'vitest';

import {
  buildCloudflareGatewayBaseUrl,
  buildCloudflareGatewayHeaders,
  resolveCloudflareGatewayConfig,
} from '@/integrations/ai/gateway/cloudflare/cloudflare-gateway';

describe('resolveCloudflareGatewayConfig', () => {
  it('mengembalikan null tanpa slug agar pemanggil tetap direct', () => {
    expect(resolveCloudflareGatewayConfig({ accountId: 'acct', gatewaySlug: null })).toBeNull();
    expect(resolveCloudflareGatewayConfig({ accountId: 'acct', gatewaySlug: '  ' })).toBeNull();
    expect(resolveCloudflareGatewayConfig({ accountId: '', gatewaySlug: 'gw' })).toBeNull();
  });

  it('menyimpan slug dan menjepit TTL ke batas gateway', () => {
    const config = resolveCloudflareGatewayConfig({ accountId: 'acct', gatewaySlug: 'redaksi', cacheTtlSeconds: 99_999_999 });
    expect(config?.gatewaySlug).toBe('redaksi');
    expect(buildCloudflareGatewayHeaders(config!)).toEqual({ 'cf-aig-cache-ttl': '2592000' });
  });

  it('membangun base URL google-ai-studio dan header skip-cache', () => {
    const config = resolveCloudflareGatewayConfig({ accountId: 'acct', gatewaySlug: 'redaksi', skipCache: true })!;
    expect(buildCloudflareGatewayBaseUrl(config, 'google-ai-studio')).toBe(
      'https://gateway.ai.cloudflare.com/v1/acct/redaksi/google-ai-studio',
    );
    expect(buildCloudflareGatewayHeaders(config)).toEqual({ 'cf-aig-skip-cache': 'true' });
  });
});
