const SENSITIVE_KEY_PATTERN = /(authorization|cookie|credential|database.*url|dsn|hash|key(?:id)?|password|pepper|private|secret|signature|signed.*url|token)/i;
const REDACTED = '[REDACTED]';
const MAX_DEPTH = 8;

export interface RedactionOptions {
  readonly secretSentinels?: readonly string[];
}

function redactKnownSecrets(value: string, sentinels: readonly string[]): string {
  return sentinels.reduce(
    (redacted, sentinel) => (sentinel.length > 0 ? redacted.replaceAll(sentinel, REDACTED) : redacted),
    value,
  );
}

function redactCredentialPatterns(value: string): string {
  return value
    .replace(/(https?:\/\/)[^\s/@:]+:[^\s/@]+@/gi, `$1${REDACTED}@`)
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, `Bearer ${REDACTED}`)
    .replace(/([?&](?:access_key|api_key|credential|key|secret|signature|token)=)[^&#\s]+/gi, `$1${REDACTED}`);
}

function redactString(value: string, sentinels: readonly string[]): string {
  return redactCredentialPatterns(redactKnownSecrets(value, sentinels));
}

function redactValue(value: unknown, sentinels: readonly string[], depth: number, seen: WeakSet<object>): unknown {
  if (depth > MAX_DEPTH) {
    return '[TRUNCATED]';
  }
  if (typeof value === 'string') {
    return redactString(value, sentinels);
  }
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (seen.has(value)) {
    return '[CIRCULAR]';
  }
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item, sentinels, depth + 1, seen));
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      SENSITIVE_KEY_PATTERN.test(key) ? REDACTED : redactValue(entry, sentinels, depth + 1, seen),
    ]),
  );
}

export function redact<T>(value: T, options: RedactionOptions = {}): unknown {
  return redactValue(value, options.secretSentinels ?? [], 0, new WeakSet<object>());
}

export function sanitizeError(error: unknown, options: RedactionOptions = {}): Readonly<Record<string, unknown>> {
  if (error instanceof Error) {
    return Object.freeze({
      name: error.name,
      message: 'A dependency operation failed.',
      ...(options.secretSentinels === undefined ? {} : { redactionApplied: true }),
    });
  }
  return Object.freeze({ name: 'UnknownError', message: 'An unexpected error occurred.' });
}
