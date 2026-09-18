import { describe, expect, it } from 'vitest';

import { normalizeConfiguredHostname } from '@/core/hostname/normalize-configured-hostname';
import { normalizeRequestHostname } from '@/core/hostname/normalize-request-hostname';

describe('normalizeRequestHostname', () => {
  it('menerima hostname valid dan menurunkan huruf', () => {
    expect(normalizeRequestHostname('Fakta01.MY.ID')).toEqual({ ok: true, hostname: 'fakta01.my.id' });
  });

  it('menolak input kosong sebagai missing', () => {
    expect(normalizeRequestHostname(null)).toEqual({ ok: false, reason: 'missing' });
    expect(normalizeRequestHostname('   ')).toEqual({ ok: false, reason: 'missing' });
  });

  it('menolak multi-host sebagai repeated', () => {
    expect(normalizeRequestHostname('a.example,b.example')).toEqual({ ok: false, reason: 'repeated' });
    expect(normalizeRequestHostname(' a.example ')).toEqual({ ok: false, reason: 'repeated' });
  });

  it('mengupas port valid dan menolak port liar', () => {
    expect(normalizeRequestHostname('fakta01.my.id:443')).toEqual({ ok: true, hostname: 'fakta01.my.id' });
    expect(normalizeRequestHostname('fakta01.my.id:99999')).toEqual({ ok: false, reason: 'invalid' });
    expect(normalizeRequestHostname('a:b:c.example')).toEqual({ ok: false, reason: 'invalid' });
  });

  it('menolak path, spasi, IP, dan label rusak', () => {
    expect(normalizeRequestHostname('fakta01.my.id/search')).toEqual({ ok: false, reason: 'invalid' });
    expect(normalizeRequestHostname('192.168.0.1')).toEqual({ ok: false, reason: 'invalid' });
    expect(normalizeRequestHostname('-buruk-.example')).toEqual({ ok: false, reason: 'invalid' });
    expect(normalizeRequestHostname('localhost')).toEqual({ ok: true, hostname: 'localhost' });
  });
});

describe('normalizeConfiguredHostname', () => {
  it('menerima hostname konfigurasi valid', () => {
    expect(normalizeConfiguredHostname(' Wonosobo.Fakta01.my.id. ')).toBe('wonosobo.fakta01.my.id');
  });

  it('menolak wildcard, path, port, dan IP', () => {
    expect(normalizeConfiguredHostname('*.example')).toBe(null);
    expect(normalizeConfiguredHostname('a.example/x')).toBe(null);
    expect(normalizeConfiguredHostname('a.example:443')).toBe(null);
    expect(normalizeConfiguredHostname('10.0.0.1')).toBe(null);
    expect(normalizeConfiguredHostname('single')).toBe(null);
    expect(normalizeConfiguredHostname('')).toBe(null);
  });
});
