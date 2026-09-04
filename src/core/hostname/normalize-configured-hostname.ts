import { isIP } from 'node:net';
import { domainToASCII } from 'node:url';

const HOSTNAME_MAX_LENGTH = 253;
const HOST_LABEL_PATTERN = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/;

export function normalizeConfiguredHostname(input: string): string | null {
  const trimmed = input.trim();
  const withoutDot = trimmed.endsWith('.') ? trimmed.slice(0, -1) : trimmed;
  if (!withoutDot || withoutDot.includes('*') || withoutDot.includes(',') || withoutDot.includes('/') || withoutDot.includes('@') || withoutDot.includes(':')) {
    return null;
  }
  const ascii = domainToASCII(withoutDot).toLowerCase();
  if (!ascii || ascii.length > HOSTNAME_MAX_LENGTH || isIP(ascii) !== 0) return null;
  const labels = ascii.split('.');
  return labels.length >= 2 && labels.every((label) => HOST_LABEL_PATTERN.test(label)) ? ascii : null;
}
