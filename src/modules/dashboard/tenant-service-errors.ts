import type { z } from 'zod';

export class DashboardValidationError extends Error {
  constructor(readonly fields: Readonly<Record<string, readonly string[]>>) { super('Dashboard validation failed'); }
}

/** Batas panjang pesan agar satu error tidak membanjiri telemetry. */
const ERROR_MESSAGE_LIMIT = 300;

/** Kedalaman rantai `cause` yang ditelusuri. */
const ERROR_CAUSE_DEPTH = 4;

export function fieldErrors(error: z.ZodError): Readonly<Record<string, readonly string[]>> {
  const output: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.') || 'request';
    output[path] = [...(output[path] ?? []), issue.message];
  }
  return output;
}

/**
 * Klasifikasikan satu error untuk log lewat nama konstruktor aslinya.
 *
 * @param error - Error yang ditangkap dari lapisan repositori.
 * @returns Nama konstruktor, atau `NonError` bila bukan objek Error.
 * @remarks `error.name` saja tidak cukup. Drizzle dan `TypeError` sama-sama
 * bisa melaporkan `name` sebagai `Error`, sehingga setiap kegagalan terlihat
 * identik di log. Nama konstruktor yang membedakan keduanya.
 */
export function errorIdentity(error: unknown): string {
  if (!(error instanceof Error)) return 'NonError';
  return error.constructor.name === 'Object' ? 'Error' : error.constructor.name;
}

/**
 * Ambil metadata driver yang aman-log dari seluruh rantai penyebab.
 *
 * @param error - Error yang ditangkap dari lapisan repositori.
 * @returns Field log dari rantai `cause` (`code`, `table`, `column`,
 * `constraint`), diambil dari lapisan terdalam yang punya nilai.
 * @remarks Pesan, `detail`, dan argumen query tidak pernah ikut agar PII
 * tidak bocor ke telemetry. Menelusuri `cause` penting karena
 * `DrizzleQueryError` menyimpan error Postgres di sana, sehingga `code` asli
 * sebelumnya hilang dari log.
 */
export function driverErrorContext(error: Error): { readonly [key: string]: string } {
  const fields: Record<string, string> = {};
  const seen = new Set<unknown>();
  let current: unknown = error;
  for (let depth = 0; depth < ERROR_CAUSE_DEPTH; depth += 1) {
    if (typeof current !== 'object' || current === null || seen.has(current)) break;
    seen.add(current);
    const record = current as Record<string, unknown>;
    for (const key of ['code', 'table', 'column', 'constraint'] as const) {
      const value = record[key];
      if (typeof value === 'string' && value !== '' && fields[key] === undefined) {
        fields[key] = value.slice(0, ERROR_MESSAGE_LIMIT);
      }
    }
    current = record.cause;
  }
  return fields;
}

/**
 * Ambil pesan error yang aman-log.
 *
 * @param error - Error yang ditangkap dari lapisan repositori.
 * @returns Potongan pesan, atau `undefined` bila error berasal dari driver.
 * @remarks Error yang dilempar kode aplikasi sendiri, misalnya
 * `schema_gate_unsatisfied: applied=... required=...`, hanya memuat nomor
 * versi dan aman dicatat. Pesan itulah satu-satunya petunjuk yang membuat
 * kegagalan bisa ditindaklanjuti. Error dari driver Postgres tidak ikut karena
 * `message`-nya bisa memuat constraint, kolom, dan cuplikan baris;
 * `errorIdentity` sudah menjembatani kasus itu.
 */
export function safeErrorMessage(error: unknown): string | undefined {
  if (!(error instanceof Error)) return undefined;
  const driverFields = ['code', 'constraint', 'table', 'column', 'severity', 'detail'];
  const record = error as unknown as Record<string, unknown>;
  if (driverFields.some((key) => typeof record[key] === 'string')) return undefined;
  const message = error.message.trim();
  if (message === '') return undefined;
  return message.length > ERROR_MESSAGE_LIMIT ? `${message.slice(0, ERROR_MESSAGE_LIMIT)}…` : message;
}
