import { describe, expect, it } from 'vitest';

import { resolveContactChannels } from '@/modules/site/company-contact';

describe('resolveContactChannels', () => {
  it('kosong bila perusahaan dan situs belum diisi', () => {
    expect(resolveContactChannels({})).toEqual([]);
  });

  it('override situs menang atas default dan kunci ekstra situs ikut tampil', () => {
    const channels = resolveContactChannels({ facebook: 'https://facebook.com/tenant', blog: 'https://blog.example' });
    const facebook = channels.find((c) => c.key === 'facebook');
    expect(facebook?.href).toBe('https://facebook.com/tenant');
    expect(channels.some((c) => c.key === 'blog' && c.label === 'Blog')).toBe(true);
  });

  it('nilai kosong dibuang', () => {
    expect(resolveContactChannels({ facebook: '   ' })).toEqual([]);
  });
});
