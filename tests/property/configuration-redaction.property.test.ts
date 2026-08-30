import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { validateRuntimeConfig } from '@/config/schema';
import { sanitizeError } from '@/shared/security/redaction';
import { assertProperty } from '../helpers/property';
import { createValidRuntimeEnvironment } from '../helpers/runtime-environment';

const secretKeyArbitrary = fc.constantFrom(
  'SUPABASE_SERVICE_ROLE_KEY',
  'CLOUDFLARE_API_TOKEN',
  'CLOUDFLARE_ORIGIN_SECRET',
  'VERCEL_API_TOKEN',
  'R2_SECRET_ACCESS_KEY',
  'UPSTASH_REDIS_REST_TOKEN',
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_WEBHOOK_SECRET',
  'GENERIC_WEBHOOK_SECRET',
  'CRON_SECRET',
);

// Feature: indicate-mvp, Property 2: Configuration errors disclose no secrets
// **Validates: Requirements 2.10, 17.23**
describe('Property 2: configuration redaction', () => {
  it('never includes generated secret sentinels in validation or sanitized error output', () => {
    assertProperty(
      'Property 2: Configuration errors disclose no secrets',
      fc.property(
        secretKeyArbitrary,
        fc.stringMatching(/^[A-Za-z0-9_-]{12,40}$/),
        (secretKey, sentinel) => {
          const environment = createValidRuntimeEnvironment({
            [secretKey]: sentinel,
            MVP_ROOT_HOSTS: 'duplicate.example.web.id,duplicate.example.web.id,third.example.web.id',
          });
          const result = validateRuntimeConfig(environment);
          expect(result.success).toBe(false);
          const serialized = JSON.stringify(result);
          expect(serialized).not.toContain(sentinel);

          const sanitized = sanitizeError(new Error(`provider failed with ${sentinel}`), {
            secretSentinels: [sentinel],
          });
          expect(JSON.stringify(sanitized)).not.toContain(sentinel);
        },
      ),
    );
  });
});
