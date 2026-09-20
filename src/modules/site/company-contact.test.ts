import { describe, expect, it } from 'vitest';

import { channelAction, channelHandle, isPrimaryContact, pickPublisherSocials, resolveContactChannels, resolvePublisherChannels } from '@/modules/site/company-contact';

describe('resolveContactChannels', () => {
  it('default perusahaan tampil bila situs belum diisi', () => {
    const channels = resolveContactChannels({});
    const byKey = new Map(channels.map((c) => [c.key, c.href] as const));
    expect(byKey.get('email')).toBe('mailto:sancaphenacakra@gmail.com');
    expect(byKey.get('telepon')).toBe('tel:085641159405');
    expect(byKey.get('facebook')).toBe('https://facebook.com/safenca.id');
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
    expect(channels.find((c) => c.key === 'facebook')?.href).toBe('https://facebook.com/safenca.id');
  });
});

describe('channelHandle, channelAction, isPrimaryContact', () => {
  it('mengurai email, telepon, dan whatsapp', () => {
    expect(channelHandle({ key: 'email', label: 'Email', href: 'mailto:sancaphenacakra@gmail.com' })).toBe('sancaphenacakra@gmail.com');
    expect(channelHandle({ key: 'telepon', label: 'Telepon', href: 'tel:085641159405' })).toBe('085641159405');
    expect(channelHandle({ key: 'whatsapp', label: 'WhatsApp', href: 'https://wa.me/6285641159405' })).toBe('085641159405');
  });

  it('mengurai handle sosmed dengan @ bila wajar', () => {
    expect(channelHandle({ key: 'instagram', label: 'Instagram', href: 'https://instagram.com/safenca.id' })).toBe('@safenca.id');
    expect(channelHandle({ key: 'x', label: 'X', href: 'https://x.com/safenca_id' })).toBe('@safenca_id');
    expect(channelHandle({ key: 'youtube', label: 'YouTube', href: 'https://youtube.com/@safenca.id' })).toBe('safenca.id');
    expect(channelHandle({ key: 'facebook', label: 'Facebook', href: 'https://facebook.com/safenca.id' })).toBe('safenca.id');
  });

  it('kata kerja dan kanal utama sesuai kunci', () => {
    expect(channelAction('whatsapp')).toBe('Chat');
    expect(channelAction('instagram')).toBe('Ikuti');
    expect(channelAction('email')).toBe('Kirim email');
    expect(channelAction('blog')).toBe('Buka');
    expect(isPrimaryContact('email')).toBe(true);
    expect(isPrimaryContact('telepon')).toBe(true);
    expect(isPrimaryContact('whatsapp')).toBe(true);
    expect(isPrimaryContact('instagram')).toBe(false);
  });
});

describe('pickPublisherSocials', () => {
  it('mengambil kanal sosmed dan membuang kunci tampilan serta nilai kosong', () => {
    const socials = pickPublisherSocials({
      facebook: ' https://facebook.com/tenant ',
      logoUrl: 'https://cdn.example/logo.png',
      city: 'Wonosobo',
      bio: 'Bio humas.',
      blog: 'https://blog.example',
      thread: 42,
      kosong: '   ',
    });
    expect(socials).toEqual({ facebook: 'https://facebook.com/tenant', blog: 'https://blog.example' });
  });
});

describe('resolvePublisherChannels', () => {
  it('urut sesuai SOCIAL_ORDER tanpa fallback default perusahaan', () => {
    const channels = resolvePublisherChannels({
      youtube: 'https://youtube.com/@tenant',
      facebook: 'https://facebook.com/tenant',
    });
    expect(channels.map((c) => c.key)).toEqual(['facebook', 'youtube']);
    expect(channels.find((c) => c.key === 'instagram')).toBeUndefined();
  });

  it('kanal baru punya label dan ikon', () => {
    const channels = resolvePublisherChannels({
      threads: 'https://threads.com/@tenant',
      github: 'https://github.com/tenant',
    });
    expect(channels.map((c) => `${c.key}:${c.label}`)).toEqual(['threads:Threads', 'github:GitHub']);
  });
});
