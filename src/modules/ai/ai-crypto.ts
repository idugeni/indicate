import 'server-only';

import { sql } from 'drizzle-orm';

import type { AiDb } from '@/modules/ai/ai-types';

function firstColumnValue(value: unknown, column: string): unknown {
  if (!Array.isArray(value)) return undefined;
  const row = value[0];
  if (typeof row !== 'object' || row === null) return undefined;
  return (row as Record<string, unknown>)[column];
}

/**
 * Mask a plaintext key for administrative display.
 *
 * @param plainKey - Plaintext key; never persisted or logged by the caller.
 * @returns First and last four characters with the middle removed, or bullets for short input.
 */
export function maskApiKey(plainKey: string): string {
  if (!plainKey) return '••••••••';
  const trimmed = plainKey.trim();
  if (trimmed.length <= 8) return '••••••••';
  return `${trimmed.slice(0, 4)}...${trimmed.slice(-4)}`;
}

/**
 * Encrypt a plaintext key through the database encryption function.
 *
 * @param db - Runtime database port.
 * @param plainKey - Plaintext key held in memory only for this call.
 * @returns Ciphertext from `indicate_private.encrypt_ai_key`, or empty string on failure.
 * @remarks Key custody stays inside PostgreSQL: no `node:crypto`, no
 * environment master secret. An empty result must make the caller skip the
 * credential rather than fall back to any other key source.
 */
export async function encryptAiKey(db: AiDb, plainKey: string): Promise<string> {
  if (!plainKey) return '';
  try {
    const value = await db.execute(sql`select indicate_private.encrypt_ai_key(${plainKey}) as cipher`);
    const cipher = firstColumnValue(value, 'cipher');
    return typeof cipher === 'string' ? cipher : '';
  } catch {
    return '';
  }
}

/**
 * Decrypt a stored ciphertext through the database decryption function.
 *
 * @param db - Runtime database port.
 * @param payload - Ciphertext produced by `encryptAiKey`.
 * @returns Plaintext key, or empty string when undecryptable.
 * @remarks Database-only resolution: failures return empty string and never
 * consult environment variables, so a missing or undecryptable row cannot
 * silently escalate to a shared fallback key.
 */
export async function decryptAiKey(db: AiDb, payload: string): Promise<string> {
  if (!payload) return '';
  try {
    const value = await db.execute(sql`select indicate_private.decrypt_ai_key(${payload}) as plain`);
    const plain = firstColumnValue(value, 'plain');
    return typeof plain === 'string' ? plain : '';
  } catch {
    return '';
  }
}
