import { describe, expect, it } from 'vitest';

import {
  DASHBOARD_ACCESS_KEY_COOKIE,
  readAccessKeyCookie,
  renderAccessKeyCookie,
  renderClearedAccessKeyCookie,
} from '@/modules/auth/dashboard-access-keys/cookie';

describe('cookie kunci akses dashboard', () => {
  it('membaca bearer dari header cookie campuran', () => {
    expect(readAccessKeyCookie(null)).toBeNull();
    expect(readAccessKeyCookie('')).toBeNull();
    expect(readAccessKeyCookie(`sesi=abc; ${DASHBOARD_ACCESS_KEY_COOKIE}=inda_kunci%2Erahasia; lain=1`)).toBe(
      'inda_kunci.rahasia',
    );
  });

  it('me-render cookie HttpOnly Lax dengan umur terbatas', () => {
    const rendered = renderAccessKeyCookie('inda_a.b', { secure: true, maxAgeSeconds: 3600 });
    expect(rendered).toContain(`${DASHBOARD_ACCESS_KEY_COOKIE}=inda_a.b`);
    expect(rendered).toContain('HttpOnly');
    expect(rendered).toContain('SameSite=Lax');
    expect(rendered).toContain('Secure');
    expect(rendered).toContain('Max-Age=3600');
  });

  it('membersihkan bearer saat keluar', () => {
    expect(renderClearedAccessKeyCookie()).toContain('Max-Age=0');
  });
});
