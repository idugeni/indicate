import { describe, expect, it } from 'vitest';

import { securityTxt } from '@/app/.well-known/security.txt/route';

describe('securityTxt', () => {
  it('memuat kontak, kedaluwarsa setahun, dan bahasa', () => {
    const body = securityTxt('https://indicate.website/contact', new Date('2026-10-01T00:00:00.000Z'));
    expect(body).toContain('Contact: https://indicate.website/contact');
    expect(body).toContain('Expires: 2027-10-01T00:00:00.000Z');
    expect(body).toContain('Preferred-Languages: id, en');
  });

  it('memakai kontak tenant untuk host tenant', () => {
    const body = securityTxt('https://portal.example/kontak');
    expect(body).toContain('Contact: https://portal.example/kontak');
  });
});
