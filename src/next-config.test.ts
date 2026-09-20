import { describe, expect, it } from 'vitest';

// eslint-disable-next-line no-restricted-imports -- next.config.ts lives outside src/ so @/ cannot reach it; relative import is the only option.
import nextConfig from '../next.config';

describe('next.config cache headers', () => {
  it('mengunci rute kontrol dan api ke private no-store', async () => {
    const headers = await nextConfig.headers?.();
    const sources = (headers ?? []).map((entry) => entry.source);
    for (const source of [
      '/dashboard/:path*',
      '/sign-in/:path*',
      '/sign-up/:path*',
      '/update-password/:path*',
      '/api/:path*',
    ]) {
      expect(sources).toContain(source);
    }
    for (const entry of headers ?? []) {
      expect(entry.headers).toEqual([{ key: 'Cache-Control', value: 'private, no-store, max-age=0' }]);
    }
  });

  it('tidak lagi mempublikasi cache root dashboard', async () => {
    const headers = await nextConfig.headers?.();
    expect((headers ?? []).some((entry) => 'has' in entry)).toBe(false);
  });
});
