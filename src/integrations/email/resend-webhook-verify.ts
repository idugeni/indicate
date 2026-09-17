import 'server-only';

import { Resend } from 'resend';

import type { ResendEventVerifier } from '@/modules/integrations/resend-webhook-service';

/**
 * Builds the Svix verifier for inbound Resend webhooks.
 *
 * @param apiKey - Resend API key from server-only configuration.
 * @param webhookSecret - Signing secret of the registered webhook endpoint.
 * @returns Verifier closing over the SDK; throws on forged payloads.
 */
export function createResendEventVerifier(apiKey: string, webhookSecret: string): ResendEventVerifier {
  const resend = new Resend(apiKey);
  return (rawBody, headers) => {
    const verified = resend.webhooks.verify({ payload: rawBody, headers, webhookSecret });
    return { type: verified.type };
  };
}
