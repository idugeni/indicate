import 'server-only';

import { z } from 'zod';

import type { EmailPort } from '@/modules/integrations/ports';

export const newsletterSubscribeSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254)
    .refine((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), { message: 'Invalid email address' }),
});

export interface NewsletterSubscription {
  readonly email: string;
  readonly siteId: string;
  readonly siteName: string;
}

interface NewsletterContent {
  readonly subject: string;
  readonly text: string;
  readonly html: string;
}

/**
 * Builds the Indonesian newsletter confirmation email for a new subscriber.
 *
 * @param siteName - Public portal name shown in the greeting.
 * @returns Subject with text and HTML bodies.
 */
export function buildNewsletterConfirmEmail(siteName: string): NewsletterContent {
  const name = siteName.trim() === '' ? 'portal berita ini' : siteName.trim();
  const text = [
    `Terima kasih telah berlangganan newsletter ${name}!`,
    '',
    'Ringkasan berita pilihan redaksi akan dikirim ke email ini setiap pagi.',
    '',
    'Berhenti kapan saja dengan membalas email ini dengan subjek "Berhenti".',
    '',
    `Hormat kami,\nRedaksi ${name}`,
  ].join('\n');
  const html = [
    '<!DOCTYPE html>',
    '<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta http-equiv="X-UA-Compatible" content="IE=edge"></head>',
    '<body style="margin:0;padding:0;background-color:#f4f4f5;">',
    '<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding-top:24px;padding-bottom:24px;">',
    '<table width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="max-width:600px;background-color:#ffffff;">',
    '<tr><td style="padding-top:28px;padding-bottom:8px;padding-left:32px;padding-right:32px;">',
    `<p style="margin:0 0 12px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#27272a;">Terima kasih telah berlangganan newsletter ${name}!</p>`,
    '<p style="margin:0 0 12px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#27272a;">Ringkasan berita pilihan redaksi akan dikirim ke email ini setiap pagi.</p>',
    '<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#27272a;">Berhenti kapan saja dengan membalas email ini dengan subjek &quot;Berhenti&quot;.</p>',
    '</td></tr>',
    '<tr><td style="padding-top:20px;padding-bottom:28px;padding-left:32px;padding-right:32px;">',
    `<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#71717a;">Email ini dikirim karena alamat ini didaftarkan pada formulir newsletter ${name}.</p>`,
    '</td></tr>',
    '</table>',
    '</td></tr></table>',
    '</body></html>',
  ].join('');
  return Object.freeze({ subject: `Berlangganan newsletter ${name} dikonfirmasi`, text, html });
}

/**
 * Registers public newsletter subscribers in the Resend audience with a confirmation email.
 * Never throws: delivery failures resolve to an unsubscribed outcome so public pages stay green.
 */
export class EmailNewsletterService {
  constructor(private readonly port: EmailPort | null) {}

  /**
   * Registers the address and sends the confirmation email exactly once per site.
   *
   * @param subscription - Validated address with its owning site.
   * @returns Whether the confirmation email was accepted by the provider.
   */
  async subscribe(subscription: NewsletterSubscription): Promise<{ readonly subscribed: boolean }> {
    if (this.port === null || subscription.email.trim() === '' || subscription.siteId.trim() === '') {
      return Object.freeze({ subscribed: false });
    }
    try {
      const email = subscription.email.trim().toLowerCase();
      await this.port.upsertContact({ email });
      const content = buildNewsletterConfirmEmail(subscription.siteName);
      await this.port.send({
        to: [email],
        subject: content.subject,
        text: content.text,
        html: content.html,
        idempotencyKey: `newsletter/${subscription.siteId}/${email}`,
      });
      return Object.freeze({ subscribed: true });
    } catch {
      return Object.freeze({ subscribed: false });
    }
  }
}
