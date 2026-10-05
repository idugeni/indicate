import { describe, expect, it, vi } from 'vitest';

import { EmailNewsletterService, buildNewsletterConfirmEmail, newsletterSubscribeSchema } from '@/modules/integrations/email-newsletter-service';

describe('newsletterSubscribeSchema', () => {
  it('menerima alamat valid dan menormalkan huruf kecil', () => {
    expect(newsletterSubscribeSchema.safeParse({ email: '  Reader@Contoh.ID ' }).success).toBe(true);
    expect(newsletterSubscribeSchema.parse({ email: 'Reader@Contoh.ID' })).toEqual({ email: 'reader@contoh.id' });
  });

  it('menolak alamat bukan email', () => {
    expect(newsletterSubscribeSchema.safeParse({ email: 'bukan-email' }).success).toBe(false);
    expect(newsletterSubscribeSchema.safeParse({ email: '' }).success).toBe(false);
    expect(newsletterSubscribeSchema.safeParse({}).success).toBe(false);
  });
});

describe('buildNewsletterConfirmEmail', () => {
  it('menyebut nama portal di subjek dan isi', () => {
    const content = buildNewsletterConfirmEmail('Portal Contoh');
    expect(content.subject).toContain('Portal Contoh');
    expect(content.text).toContain('Portal Contoh');
    expect(content.html).toContain('Portal Contoh');
  });

  it('jatuh kembali saat nama portal kosong', () => {
    const content = buildNewsletterConfirmEmail('   ');
    expect(content.subject).toContain('portal berita ini');
  });
});

describe('EmailNewsletterService', () => {
  it('mendaftarkan kontak lalu mengirim konfirmasi sekali per situs', async () => {
    const port = { send: vi.fn(async () => ({ id: 'email-1' })), upsertContact: vi.fn(async () => ({ id: 'contact-1' })) };
    const service = new EmailNewsletterService(port);
    const result = await service.subscribe({ email: 'reader@example.com', siteId: 'site-1', siteName: 'Portal Contoh' });
    expect(result).toEqual({ subscribed: true });
    expect(port.upsertContact).toHaveBeenCalledWith({ email: 'reader@example.com' });
    expect(port.send).toHaveBeenCalledWith(expect.objectContaining({ to: ['reader@example.com'], idempotencyKey: 'newsletter/site-1/reader@example.com' }));
  });

  it('tetap diam tanpa port terkonfigurasi', async () => {
    const service = new EmailNewsletterService(null);
    await expect(service.subscribe({ email: 'reader@example.com', siteId: 'site-1', siteName: 'Portal Contoh' })).resolves.toEqual({
      subscribed: false,
    });
  });

  it('tidak pernah melempar saat provider gagal', async () => {
    const port = {
      send: vi.fn(async () => {
        throw new Error('provider down');
      }),
      upsertContact: vi.fn(async () => ({ id: 'contact-1' })),
    };
    const service = new EmailNewsletterService(port);
    await expect(service.subscribe({ email: 'reader@example.com', siteId: 'site-1', siteName: 'Portal Contoh' })).resolves.toEqual({
      subscribed: false,
    });
  });
});
