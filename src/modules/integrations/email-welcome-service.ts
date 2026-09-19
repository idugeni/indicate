import 'server-only';

import type { EmailPort } from '@/modules/integrations/ports';

export interface WelcomeSignup {
  readonly authUserId: string;
  readonly email: string;
  readonly displayName: string;
}

interface WelcomeContent {
  readonly subject: string;
  readonly text: string;
  readonly html: string;
}

/**
 * Builds the Indonesian onboarding email for a confirmed signup.
 *
 * @param displayName - Recipient display name shown in the greeting.
 * @returns Subject with text and HTML bodies.
 */
export function buildWelcomeEmail(displayName: string): WelcomeContent {
  const greeting = displayName.trim() === '' ? 'di Indicate' : `di Indicate, ${displayName.trim()}`;
  const text = [
    `Selamat datang ${greeting}!`,
    '',
    'Akun Anda sudah aktif. Indicate adalah platform penerbitan jaringan media multi-tenant: satu ruang redaksi untuk mengelola banyak portal berita di banyak domain dan wilayah.',
    '',
    'Langkah awal yang disarankan:',
    '',
    '- Jelajahi dashboard untuk melihat organisasi dan peran Anda.',
    '- Lengkapi profil dan/Add ...(truncated 962 chars)',
  ].join('\n');
  const html = [
    '<!DOCTYPE html>',
    '<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta http-equiv="X-UA-Compatible" content="IE=edge"></head>',
    '<body style="margin:0;padding:0;background-color:#f4f4f5;">',
    '<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding-top:24px;padding-bottom:24px;">',
    '<table width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="max-width:600px;background-color:#ffffff;">',
    '<tr><td bgcolor="#1e1b4b" style="background-color:#1e1b4b;padding-top:28px;padding-bottom:28px;padding-left:32px;padding-right:32px;">',
    '<img src="https://indicate.web.id/brand/apple-touch-icon.png" width="48" height="48" border="0" alt="Indicate" style="display:block;width:48px;height:48px;border:0;">',
    '<p style="margin:12px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:22px;line-height:30px;color:#ffffff;">Indicate</p>',
    '<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#c7d2fe;">Platform Penerbitan Jaringan Media</p>',
    '</td></tr>',
    '<tr><td style="padding-top:28px;padding-bottom:8px;padding-left:32px;padding-right:32px;">',
    `<p style="margin:0 0 12px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#27272a;">Selamat datang ${greeting}! Akun Anda sudah aktif.</p>`,
    '<p style="margin:0 0 12px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#27272a;">Langkah awal yang disarankan:</p>',
    '<ul style="margin:0 0 12px 0;padding-left:20px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#27272a;">',
    '<li>Jelajahi dashboard untuk melihat organisasi dan peran Anda.</li>',
    '<li>Lengkapi profil dan preferensi akun Anda.</li>',
    '<li>Hubungi administrator organisasi bila Anda membutuhkan akses tambahan.</li>',
    '</ul>',
    '<p style="margin:0 0 20px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#27272a;">Ada kendala? Cukup balas email ini dan tim kami akan membantu.</p>',
    '<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#27272a;">Hormat kami,<br>Tim Indicate<br>PT Sanca Phena Cakra</p>',
    '</td></tr>',
    '<tr><td style="padding-top:20px;padding-bottom:28px;padding-left:32px;padding-right:32px;">',
    '<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#71717a;">Email ini dikirim karena Anda baru saja mengonfirmasi pendaftaran. Abaikan bila Anda tidak merasa mendaftar.<br>Layanan dari PT Sanca Phena Cakra (SAFENCA).</p>',
    '</td></tr>',
    '</table>',
    '</td></tr></table>',
    '</body></html>',
  ].join('');
  return Object.freeze({ subject: 'Selamat datang di Indicate — akun Anda sudah aktif', text, html });
}

/**
 * Onboards confirmed signups into the Resend audience with a welcome email.
 * Never throws: delivery failures resolve to an unsent outcome so auth flows stay green.
 */
export class EmailWelcomeService {
  constructor(private readonly port: EmailPort | null) {}

  /**
   * Registers the contact and sends the welcome email exactly once per user.
   *
   * @param signup - Confirmed identity from the auth callback.
   * @returns Whether the welcome email was accepted by the provider.
   */
  async welcome(signup: WelcomeSignup): Promise<{ readonly sent: boolean }> {
    if (this.port === null || signup.email.trim() === '' || signup.authUserId.trim() === '') {
      return Object.freeze({ sent: false });
    }
    try {
      await this.port.upsertContact({ email: signup.email, firstName: signup.displayName });
      const content = buildWelcomeEmail(signup.displayName);
      await this.port.send({
        to: [signup.email],
        subject: content.subject,
        text: content.text,
        html: content.html,
        idempotencyKey: `welcome/${signup.authUserId}`,
      });
      return Object.freeze({ sent: true });
    } catch {
      return Object.freeze({ sent: false });
    }
  }
}
