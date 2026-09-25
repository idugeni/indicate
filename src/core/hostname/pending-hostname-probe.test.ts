import { EventEmitter } from 'node:events';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const networkMocks = vi.hoisted(() => ({
  lookup: vi.fn(),
  request: vi.fn(),
}));

vi.mock('node:dns/promises', () => ({ lookup: networkMocks.lookup }));
vi.mock('node:https', () => ({ request: networkMocks.request }));

import { HttpsPendingHostnameProbe, isPublicUnicastIp } from '@/core/hostname/pending-hostname-probe';

interface MockLookupOptions {
  readonly all?: boolean;
}

interface MockRequestOptions {
  readonly lookup?: (
    hostname: string,
    options: MockLookupOptions,
    callback: (error: Error | null, addresses: unknown) => void,
  ) => void;
}

interface MockResponse extends EventEmitter {
  statusCode: number;
  headers: Record<string, string>;
  resume: () => void;
}

beforeEach(() => {
  networkMocks.lookup.mockReset();
  networkMocks.request.mockReset();
});

describe('HttpsPendingHostnameProbe tanpa jaringan', () => {
  it('menolak hostname invalid sebelum DNS', async () => {
    const probe = new HttpsPendingHostnameProbe();
    await expect(probe.verifyPendingHostname('bukan host!!', 'attempt-1')).resolves.toBe(false);
  });

  it('menolak attemptId di luar pola', async () => {
    const probe = new HttpsPendingHostnameProbe();
    await expect(probe.verifyPendingHostname('calon.example', 'attempt id spasi')).resolves.toBe(false);
  });

  it('menolak loopback karena bukan unicast publik', async () => {
    const probe = new HttpsPendingHostnameProbe();
    await expect(probe.verifyPendingHostname('localhost', 'attempt-1')).resolves.toBe(false);
  });

  it('mendukung custom lookup dengan all=true', async () => {
    networkMocks.lookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
    networkMocks.request.mockImplementation((options: MockRequestOptions, callback: (response: MockResponse) => void) => {
      const request = new EventEmitter() as EventEmitter & { setTimeout: () => EventEmitter; end: () => void };
      request.setTimeout = vi.fn().mockReturnThis();
      request.end = vi.fn(() => {
        options.lookup?.('calon.example', { all: true }, (error, addresses) => {
          expect(error).toBeNull();
          expect(addresses).toEqual([{ address: '93.184.216.34', family: 4 }]);
          const response = new EventEmitter() as MockResponse;
          response.statusCode = 425;
          response.headers = {
            'x-indicate-pending-attempt': 'attempt-1',
            'x-robots-tag': 'noindex, nofollow',
          };
          response.resume = vi.fn();
          callback(response);
          queueMicrotask(() => response.emit('end'));
        });
      });
      return request;
    });

    const probe = new HttpsPendingHostnameProbe();
    await expect(probe.verifyPendingHostname('calon.example', 'attempt-1')).resolves.toBe(true);
  });
});

describe('isPublicUnicastIp', () => {
  it('menolak IPv4-mapped IPv6 privat', () => {
    expect(isPublicUnicastIp('::ffff:127.0.0.1')).toBe(false);
    expect(isPublicUnicastIp('::ffff:10.0.0.1')).toBe(false);
    expect(isPublicUnicastIp('::ffff:192.168.1.1')).toBe(false);
    expect(isPublicUnicastIp('::FFFF:8.8.8.8')).toBe(true);
  });

  it('menolak CGNAT 100.64/10 dan meloloskan di luarnya', () => {
    expect(isPublicUnicastIp('100.64.0.1')).toBe(false);
    expect(isPublicUnicastIp('100.127.255.255')).toBe(false);
    expect(isPublicUnicastIp('100.128.0.1')).toBe(true);
    expect(isPublicUnicastIp('::ffff:100.64.0.1')).toBe(false);
  });
});
