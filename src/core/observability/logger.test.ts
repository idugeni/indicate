import { afterEach, describe, expect, it, vi } from 'vitest';

import { logApiAccess, logEvent } from '@/core/observability/logger';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('logEvent', () => {
  it('menulis info ke console.log dengan nama layanan', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logEvent('info', { event: 'uji.info', requestId: 'req-1' });
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0]?.[0]).toContain('"service":"indicate-web"');
  });

  it('menulis warn dan error ke console.error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logEvent('warn', { event: 'uji.warn' });
    logEvent('error', { event: 'uji.error' });
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('menahan debug saat flag observabilitas mati', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    logEvent('debug', { event: 'uji.debug' });
    expect(log).not.toHaveBeenCalled();
  });
});

describe('logApiAccess', () => {
  it('memetakan status ke level info, warn, dan error', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const base = { requestId: 'req-1', method: 'GET', route: 'GET /x', durationMs: 3 };
    logApiAccess({ ...base, status: 200 });
    logApiAccess({ ...base, status: 404 });
    logApiAccess({ ...base, status: 500 });
    expect(log).toHaveBeenCalledOnce();
    expect(error).toHaveBeenCalledTimes(2);
  });
});
