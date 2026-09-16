import { describe, expect, it } from 'vitest';

import { resolveContactChannels } from '@/modules/site/company-contact';

describe('resolveContactChannels', () => {
  it('default perusahaan tampil bila situs belum diisi', () => {
    const channels = resolveContactChannels({});
    const byKey = new Map(channels.map((c) => [c.key, c.href] as const));
    expect(byKey.get('email')).toBe('mailto:sancaphenacakra@gmail.com');
    expect(byKey.get('telepon')).toBe('tel:085641159405');
    expect(byKey.get('facebook')).toBe('https://facebook.com/safenca');
    expect(byKey.get('whatsapp')).toBe('https://wa.me/6285641159405');
    expect(channels.length).toBeGreaterThan(8);
  });

  it('override situs menang atas default dan kunci ekstra situs ikut tampil', () => {
    const channels = resolveContactChannels({ facebook: 'https://facebook.com/tenant', blog: 'https://blog.example' });
    const facebook = channels.find((c) => c.key === 'facebook');
    expect(facebook?.href).toBe('https://facebook.com/tenant');
    expect(channels.some((c) => c.key === 'blog' && c.label === 'Blog')).toBe(true);
  });

  it('nilai kosong situs jatuh ke default perusahaan', () => {
    const channels = resolveContactChannels({ facebook: '   ' });
    expect(channels.find((c) => c.key === 'facebook')?.href).toBe('https://facebook.com/safenca');
  });
});
