import { describe, expect, it } from 'vitest';

import { controlPlaneLlms, tenantLlms } from '@/app/llms.txt/route-helpers';

describe('controlPlaneLlms', () => {
  it('memakai URL absolut dan daftar layanan', () => {
    const body = controlPlaneLlms('indicate.website');
    expect(body).toContain('# Indicate');
    expect(body).toContain('(https://indicate.website/pricing)');
    expect(body).toContain('## Legalitas');
  });

  it('menyematkan direktori portal dan partner aktif', () => {
    const body = controlPlaneLlms(
      'indicate.website',
      [{ name: 'Portal Uji', hostname: 'portaluji.web.id' }],
      [{ name: 'Mitra Contoh' }],
    );
    expect(body).toContain('## Jaringan (https://indicate.website/network)');
    expect(body).toContain('- [Portal Uji](https://portaluji.web.id)');
    expect(body).toContain('## Partner');
    expect(body).toContain('- Mitra Contoh');
  });

  it('melewatkan seksi direktori saat data kosong', () => {
    const body = controlPlaneLlms('indicate.website');
    expect(body).not.toContain('## Jaringan');
    expect(body).not.toContain('## Partner');
  });
});

describe('tenantLlms', () => {
  it('merender kanal, liputan, dan peta situs', () => {
    const body = tenantLlms('portal.example', 'Portal', 'Kabar terkini', ['Teknologi'], [
      { title: 'Judul A', slug: 'judul-a', href: '/judul-a' },
    ]);
    expect(body).toContain('# Portal');
    expect(body).toContain('- Teknologi');
    expect(body).toContain('- [Judul A](https://portal.example/judul-a)');
    expect(body).toContain('(https://portal.example/sitemap.xml)');
  });

  it('menautkan liputan warisan ke host kota asalnya', () => {
    const body = tenantLlms('jawa-tengah.portal.example', 'Portal', 'Kabar terkini', [], [
      { title: 'Judul Kota', slug: 'judul-kota', href: 'https://kota.portal.example/judul-kota' },
    ]);
    expect(body).toContain('- [Judul Kota](https://kota.portal.example/judul-kota)');
  });

  it('membatasi liputan pada 30 artikel', () => {
    const articles = Array.from({ length: 35 }, (slot, index) => ({ title: `A${index}`, slug: `a-${index}`, href: `/a-${index}` }));
    const body = tenantLlms('portal.example', 'Portal', 'Deskripsi', [], articles);
    expect(body).toContain('a-29');
    expect(body).not.toContain('a-30');
  });
});
