import 'server-only';

import { Redis } from '@upstash/redis';

/** Longest accepted user prompt; longer input is rejected before reaching any provider. */
export const MAX_USER_PROMPT_LENGTH = 1500;

/** Longest conversation history forwarded to a provider. */
export const MAX_HISTORY_MESSAGES = 10;

/** Shared daily token ceiling across every channel and role. */
export const DAILY_AI_TOKEN_BUDGET = 250_000;

/** Shared hourly request ceiling across every channel and role. */
export const HOURLY_AI_REQUEST_LIMIT = 60;

/** Prompt-injection and instruction-hijack matchers applied to untrusted input. */
export const INJECTION_PATTERNS: readonly RegExp[] = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules)/i,
  /disregard\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules)/i,
  /you\s+are\s+now\s+(an?\s+)?(unrestricted|jailbroken|dan|evil|developer\s+mode)/i,
  /system\s+override/i,
  /show\s+me\s+(your\s+)?(system\s+prompt|developer\s+instructions|internal\s+instructions)/i,
  /reveal\s+(your\s+)?(system\s+prompt|instructions|secret\s+key|api\s+key)/i,
  /what\s+is\s+your\s+system\s+prompt/i,
  /print\s+(your\s+)?(initial\s+prompt|system\s+prompt)/i,
  /repeat\s+(everything|the\s+words)\s+above/i,
  /output\s+the\s+exact\s+text\s+of\s+your\s+instructions/i,
  /bypass\s+(all\s+)?(filters|safety|guardrails)/i,
  /act\s+as\s+a\s+linux\s+terminal/i,
  /execute\s+arbitrary\s+(code|command|sql)/i,
  /drop\s+table/i,
  /delete\s+from\s+/i,
  /select\s+\*\s+from\s+auth\./i,
];

/** Secret matchers scrubbed from every model output before it reaches a caller. */
export const SENSITIVE_PATTERNS: readonly RegExp[] = [
  /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g,
  /AIza[0-9A-Za-z-_]{35}/g,
  /sk-[a-zA-Z0-9]{20,}/g,
  /bot[0-9]{8,10}:[a-zA-Z0-9_-]{35}/g,
  /postgresql:\/\/[^:]+:[^@]+@[^/\s]+\/[^?\s]+/gi,
  /https:\/\/[a-z0-9-]+\.supabase\.co/gi,
];

export interface PromptScanResult {
  readonly isSafe: boolean;
  readonly reason?: string | undefined;
  readonly flaggedPattern?: string | undefined;
}

export interface AiBudgetStatus {
  readonly allowed: boolean;
  readonly remainingBudget: number;
}

/**
 * Connection details for the shared AI budget counters.
 *
 * @remarks Sourced from the assembled runtime configuration, never from
 * per-feature environment variables.
 */
export interface AiBudgetConfig {
  readonly url: string;
  readonly token: string;
  readonly namespace: string;
}

export interface AiBudgetGuard {
  readonly checkAiBudgetSafeguard: () => Promise<AiBudgetStatus>;
  readonly recordAiTokenUsage: (tokens: number) => Promise<void>;
}

/**
 * Scan untrusted input for injection attempts and length violations.
 *
 * @param input - Raw caller-supplied prompt.
 * @returns Safe verdict, or the blocking reason with the matched pattern source.
 */
export function scanPromptForInjection(input: string): PromptScanResult {
  const normalized = input.normalize('NFKC').trim();

  if (normalized.length > MAX_USER_PROMPT_LENGTH) {
    return {
      isSafe: false,
      reason: `Panjang input (${normalized.length} karakter) melebihi batas keamanan maksimum (${MAX_USER_PROMPT_LENGTH} karakter).`,
    };
  }

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(normalized)) {
      return {
        isSafe: false,
        reason: 'Input terindikasi mengandung instruksi yang melanggar kebijakan keamanan sistem.',
        flaggedPattern: pattern.source,
      };
    }
  }

  return { isSafe: true };
}

/**
 * Wrap untrusted caller input in explicit boundary delimiters.
 *
 * @param input - Raw caller-supplied prompt.
 * @returns Input with model-control mimicry tags stripped and wrapped as data.
 */
export function wrapUntrustedUserInput(input: string): string {
  const cleaned = input
    .replace(/<system-reminder>[\s\S]*?<\/system-reminder>/gi, '')
    .replace(/<instructions>[\s\S]*?<\/instructions>/gi, '')
    .replace(/<\|im_start\|>[\s\S]*?<\|im_end\|>/gi, '')
    .trim();

  return `<untrusted_user_query>\n${cleaned}\n</untrusted_user_query>`;
}

/**
 * Wrap retrieved database or external text as untrusted context.
 *
 * @param data - Retrieved record or payload forwarded to the model.
 * @param sourceLabel - Origin label carried into the boundary tag.
 * @returns Redacted, source-labelled context block the model must treat as data.
 */
export function wrapUntrustedRetrievedData(data: unknown, sourceLabel = 'database_record'): string {
  const serialized = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  return `<untrusted_context source="${sourceLabel}">\n${redactSecrets(serialized)}\n</untrusted_context>`;
}

/**
 * Scrub secrets, tokens, and connection strings from model output.
 *
 * @param text - Candidate output text.
 * @returns Text with every sensitive match replaced by a placeholder.
 */
export function redactSecrets(text: string): string {
  if (!text) return '';
  let sanitized = text;
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REDACTED_SENSITIVE_DATA]');
  }
  return sanitized;
}

/** Placeholder replacing a detected national identity number. */
export const PII_NIK_MASK = '[REDACTED_NIK]';

/** Placeholder replacing a detected phone number. */
export const PII_PHONE_MASK = '[REDACTED_PHONE]';

/** Placeholder replacing a detected email address. */
export const PII_EMAIL_MASK = '[REDACTED_EMAIL]';

/**
 * Strip personal identifiers from draft input before it reaches a provider.
 *
 * @param text - Raw caller-supplied draft text.
 * @returns Text with secrets, identity numbers, phone numbers, and email
 * addresses replaced by placeholders.
 */
export function scrubDraftPII(text: string): string {
  if (!text) return '';
  let sanitized = redactSecrets(text);
  sanitized = sanitized.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, PII_EMAIL_MASK);
  sanitized = sanitized.replace(/(?<!\d)\d{16}(?!\d)/g, PII_NIK_MASK);
  sanitized = sanitized.replace(/(?:(?<!\d)\+62[\s-]?\d[\d\s-]{6,13}\d(?!\d)|\b08\d{7,11}\b)/g, PII_PHONE_MASK);
  return sanitized;
}

/**
 * Build a Redis-backed daily token and hourly request budget guard.
 *
 * @param config - Upstash connection details plus the environment namespace.
 * @returns Guard whose checks fail open when Redis is unreachable.
 * @remarks Counters live in Redis so every serverless instance shares one
 * budget; an in-memory map would reset per instance and never be enforced.
 */
export function createAiBudgetGuard(config: AiBudgetConfig): AiBudgetGuard {
  const redis = new Redis({ url: config.url, token: config.token });
  const tokensKey = (day: string): string => `${config.namespace}:ai:budget:tokens:${day}`;
  const requestsKey = (hour: string): string => `${config.namespace}:ai:budget:reqs:${hour}`;

  return {
    async checkAiBudgetSafeguard(): Promise<AiBudgetStatus> {
      try {
        const now = new Date();
        const day = now.toISOString().slice(0, 10);
        const hour = now.toISOString().slice(0, 13);
        const [tokens, requests] = await Promise.all([
          redis.get<number>(tokensKey(day)),
          redis.get<number>(requestsKey(hour)),
        ]);
        const tokensToday = Number(tokens ?? 0);
        const requestsHour = Number(requests ?? 0);
        if (tokensToday >= DAILY_AI_TOKEN_BUDGET || requestsHour >= HOURLY_AI_REQUEST_LIMIT) {
          return { allowed: false, remainingBudget: Math.max(0, DAILY_AI_TOKEN_BUDGET - tokensToday) };
        }
        return { allowed: true, remainingBudget: DAILY_AI_TOKEN_BUDGET - tokensToday };
      } catch {
        return { allowed: true, remainingBudget: DAILY_AI_TOKEN_BUDGET };
      }
    },
    async recordAiTokenUsage(tokens: number): Promise<void> {
      try {
        const now = new Date();
        const day = now.toISOString().slice(0, 10);
        const hour = now.toISOString().slice(0, 13);
        const counted = Math.max(1, Math.floor(tokens || 1));
        await redis.incrby(tokensKey(day), counted);
        await redis.expire(tokensKey(day), 48 * 3600);
        await redis.incr(requestsKey(hour));
        await redis.expire(requestsKey(hour), 2 * 3600);
      } catch {
        /* Telemetry must never fail an answer. */
      }
    },
  };
}
