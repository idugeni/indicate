import { domainToASCII } from 'node:url';

const LABEL = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/;

export type HostnameNormalizationResult =
  | { readonly ok: true; readonly hostname: string }
  | { readonly ok: false; readonly reason: 'missing' | 'repeated' | 'invalid' };

/** Normalizes one HTTP Host authority without accepting forwarded or URL-shaped input. */
export function normalizeRequestHostname(rawHost: string | null | undefined): HostnameNormalizationResult {
  if (rawHost === null || rawHost === undefined || rawHost.trim() === '') return { ok: false, reason: 'missing' };
  if (rawHost !== rawHost.trim() || rawHost.includes(',')) return { ok: false, reason: 'repeated' };
  if (/[/\\@?#*\s]/u.test(rawHost) || rawHost.startsWith('[')) return { ok: false, reason: 'invalid' };

  let authority = rawHost;
  const colon = authority.lastIndexOf(':');
  if (colon >= 0) {
    if (authority.indexOf(':') !== colon) return { ok: false, reason: 'invalid' };
    const port = authority.slice(colon + 1);
    if (!/^\d{1,5}$/u.test(port) || Number(port) > 65_535) return { ok: false, reason: 'invalid' };
    authority = authority.slice(0, colon);
  }
  if (authority.endsWith('.')) authority = authority.slice(0, -1);
  if (authority === '' || authority.endsWith('.')) return { ok: false, reason: 'invalid' };

  const ascii = domainToASCII(authority).toLowerCase();
  if (ascii === '' || ascii.length > 253 || /^\d+(?:\.\d+){3}$/u.test(ascii)) return { ok: false, reason: 'invalid' };
  const labels = ascii.split('.');
  if (labels.length < 2 || labels.some((label) => !LABEL.test(label))) return { ok: false, reason: 'invalid' };
  return { ok: true, hostname: ascii };
}
