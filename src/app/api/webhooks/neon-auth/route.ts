import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export const runtime = 'nodejs';

const MAX_WEBHOOK_AGE_MS = 5 * 60 * 1000;

type NeonEmailEvent = {
  event_id?: string;
  event_type?: string;
  timestamp?: string;
  context?: { project_name?: string };
  user?: { email?: string; name?: string | null };
  event_data?: {
    otp_code?: string;
    otp_type?: string;
    expires_at?: string;
    link_type?: string;
    link_url?: string;
  };
};

function requiredEnv(name: 'NEON_AUTH_BASE_URL' | 'RESEND_API_KEY' | 'RESEND_DEFAULT_FROM') {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character] ?? character;
  });
}

async function verifyNeonWebhook(rawBody: string, headers: Headers): Promise<NeonEmailEvent> {
  const signature = headers.get('x-neon-signature');
  const keyId = headers.get('x-neon-signature-kid');
  const timestamp = headers.get('x-neon-timestamp');

  if (!signature || !keyId || !timestamp || !/^\d+$/.test(timestamp)) {
    throw new Error('Missing or malformed Neon webhook signature headers');
  }

  const timestampMs = Number(timestamp) * 1000;
  if (!Number.isSafeInteger(timestampMs) || Math.abs(Date.now() - timestampMs) > MAX_WEBHOOK_AGE_MS) {
    throw new Error('Neon webhook timestamp is outside the accepted window');
  }

  const authBaseUrl = requiredEnv('NEON_AUTH_BASE_URL').replace(/\/$/, '');
  const jwksResponse = await fetch(`${authBaseUrl}/.well-known/jwks.json`, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(5000),
    cache: 'no-store',
  });
  if (!jwksResponse.ok) throw new Error('Unable to retrieve Neon Auth signing keys');

  const jwks = (await jwksResponse.json()) as {
    keys?: Array<JsonWebKey & { kid?: string; crv?: string; kty?: string }>;
  };
  const jwk = jwks.keys?.find((key) => key.kid === keyId);
  if (!jwk || jwk.kty !== 'OKP' || jwk.crv !== 'Ed25519') {
    throw new Error('Neon webhook signing key was not found or is unsupported');
  }

  const publicKey = crypto.createPublicKey({ key: jwk, format: 'jwk' });
  const [headerB64, emptyPayload, signatureB64] = signature.split('.');
  if (!headerB64 || emptyPayload !== '' || !signatureB64) {
    throw new Error('Neon webhook signature is not a detached JWS');
  }

  const payloadB64 = Buffer.from(rawBody, 'utf8').toString('base64url');
  const signaturePayload = `${timestamp}.${payloadB64}`;
  const signaturePayloadB64 = Buffer.from(signaturePayload, 'utf8').toString('base64url');
  const signingInput = `${headerB64}.${signaturePayloadB64}`;
  const valid = crypto.verify(
    null,
    Buffer.from(signingInput),
    publicKey,
    Buffer.from(signatureB64, 'base64url'),
  );
  if (!valid) throw new Error('Invalid Neon webhook signature');

  return JSON.parse(rawBody) as NeonEmailEvent;
}

function getEmailContent(event: NeonEmailEvent) {
  const userEmail = event.user?.email?.trim();
  if (!userEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) {
    throw new Error('Neon email event has no valid recipient');
  }

  const userName = event.user?.name?.trim() || 'Pengguna INDICATE';
  const greeting = escapeHtml(userName);
  const appName = escapeHtml(event.context?.project_name?.trim() || 'INDICATE');
  const data = event.event_data ?? {};

  if (event.event_type === 'send.otp') {
    const code = data.otp_code?.trim();
    if (!code || !/^\d{6}$/.test(code)) throw new Error('Neon OTP event has no valid six-digit code');

    const purpose = data.otp_type;
    const labels: Record<string, { subject: string; intro: string }> = {
      'email-verification': {
        subject: 'Verifikasi email INDICATE',
        intro: 'Gunakan kode berikut untuk memverifikasi alamat email Anda.',
      },
      'forget-password': {
        subject: 'Kode pemulihan kata sandi INDICATE',
        intro: 'Gunakan kode berikut untuk melanjutkan pemulihan kata sandi Anda.',
      },
      'sign-in': {
        subject: 'Kode masuk INDICATE',
        intro: 'Gunakan kode berikut untuk menyelesaikan proses masuk Anda.',
      },
    };
    const copy = purpose ? labels[purpose] : undefined;
    if (!copy) throw new Error('Unsupported Neon OTP purpose');

    return {
      to: userEmail,
      subject: copy.subject,
      html: `<!doctype html><html lang="id"><body style="font-family:Arial,sans-serif;color:#172033;line-height:1.6"><main style="max-width:560px;margin:32px auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px"><p>${appName}</p><h1 style="font-size:22px">${copy.subject}</h1><p>Halo ${greeting},</p><p>${copy.intro}</p><p style="font-size:32px;font-weight:700;letter-spacing:8px">${code}</p><p>Kode ini bersifat rahasia. Jangan bagikan kepada siapa pun.</p><p style="color:#64748b;font-size:12px">Jika Anda tidak meminta kode ini, abaikan email ini.</p></main></body></html>`,
    };
  }

  if (event.event_type === 'send.magic_link') {
    const link = data.link_url?.trim();
    if (!link) throw new Error('Neon magic-link event has no link URL');

    let parsed: URL;
    try {
      parsed = new URL(link);
    } catch {
      throw new Error('Neon magic-link URL is invalid');
    }
    if (parsed.protocol !== 'https:' || parsed.hostname === 'supabase.co' || parsed.hostname.endsWith('.supabase.co')) {
      throw new Error('Refusing unsafe or legacy Supabase authentication URL');
    }

    const kind = data.link_type;
    const labels: Record<string, { subject: string; heading: string; intro: string; action: string }> = {
      'email-verification': {
        subject: 'Verifikasi email INDICATE',
        heading: 'Verifikasi alamat email',
        intro: 'Konfirmasikan alamat email Anda untuk menyelesaikan pendaftaran.',
        action: 'Verifikasi email',
      },
      'forget-password': {
        subject: 'Atur ulang kata sandi INDICATE',
        heading: 'Atur ulang kata sandi',
        intro: 'Gunakan tautan aman berikut untuk melanjutkan pengaturan ulang kata sandi.',
        action: 'Atur ulang kata sandi',
      },
      'sign-in': {
        subject: 'Tautan masuk INDICATE',
        heading: 'Masuk ke INDICATE',
        intro: 'Gunakan tautan aman berikut untuk menyelesaikan proses masuk.',
        action: 'Masuk ke INDICATE',
      },
    };
    const copy = kind ? labels[kind] : undefined;
    if (!copy) throw new Error('Unsupported Neon magic-link purpose');

    return {
      to: userEmail,
      subject: copy.subject,
      html: `<!doctype html><html lang="id"><body style="font-family:Arial,sans-serif;color:#172033;line-height:1.6"><main style="max-width:560px;margin:32px auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px"><p>${appName}</p><h1 style="font-size:22px">${copy.heading}</h1><p>Halo ${greeting},</p><p>${copy.intro}</p><p><a href="${escapeHtml(parsed.toString())}" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#172033;color:#fff;text-decoration:none">${copy.action}</a></p><p>Jika tombol tidak berfungsi, buka tautan berikut:</p><p style="word-break:break-all">${escapeHtml(parsed.toString())}</p><p style="color:#64748b;font-size:12px">Jika Anda tidak meminta tindakan ini, abaikan email ini.</p></main></body></html>`,
    };
  }

  throw new Error('Unsupported Neon Auth email event');
}

export async function POST(request: Request) {
  let payload: NeonEmailEvent;
  try {
    const rawBody = await request.text();
    payload = await verifyNeonWebhook(rawBody, request.headers);
  } catch {
    return NextResponse.json({ error: 'Invalid webhook request' }, { status: 401 });
  }

  if (payload.event_type !== 'send.otp' && payload.event_type !== 'send.magic_link') {
    return NextResponse.json({ error: 'Unsupported event type' }, { status: 400 });
  }

  try {
    const resend = new Resend(requiredEnv('RESEND_API_KEY'));
    const content = getEmailContent(payload);
    const result = await resend.emails.send({
      from: requiredEnv('RESEND_DEFAULT_FROM'),
      ...content,
    });
    if (result.error) {
      return NextResponse.json({ error: 'Email delivery failed' }, { status: 502 });
    }
    return NextResponse.json({ success: true, id: result.data?.id });
  } catch {
    return NextResponse.json({ error: 'Email delivery failed' }, { status: 502 });
  }
}
