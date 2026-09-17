import 'server-only';

import { Resend } from 'resend';

import type { EmailContact, EmailMessage, EmailPort } from '@/modules/integrations/ports';
import { EmailSendError } from '@/modules/integrations/ports';

type ResendPayload =
  | { readonly from: string; readonly to: string[]; readonly subject: string; readonly html: string; readonly text?: string }
  | { readonly from: string; readonly to: string[]; readonly subject: string; readonly text: string };

type ResendSender = (
  payload: ResendPayload,
  options?: { readonly idempotencyKey?: string },
) => Promise<{ readonly data: { readonly id: string } | null; readonly error: { readonly message: string } | null }>;

type ResendContactsClient = {
  readonly create: (input: { readonly email: string; readonly firstName?: string; readonly lastName?: string; readonly unsubscribed: boolean }) => Promise<{
    readonly data: { readonly id: string } | null;
    readonly error: { readonly message: string } | null;
  }>;
  readonly get: (input: { readonly email: string }) => Promise<{
    readonly data: { readonly id: string } | null;
    readonly error: { readonly message: string } | null;
  }>;
};

/**
 * Sends transactional email through the Resend API.
 *
 * @param sender - Resend send function; inject a fake in tests.
 * @param contacts - Resend contacts client; inject a fake in tests.
 * @param defaultFrom - Sender used when the message omits `from`.
 */
export class ResendEmailApiAdapter implements EmailPort {
  constructor(
    private readonly sender: ResendSender,
    private readonly contacts: ResendContactsClient,
    private readonly defaultFrom: string,
  ) {}

  /**
   * Sends one transactional email, defaulting the sender address.
   *
   * @param message - Recipients, subject, body, and optional overrides.
   * @returns Provider identifier of the accepted email.
   * @throws {Error} When recipients, subject, or body are missing.
   * @throws {EmailSendError} When the provider rejects the send or the network fails.
   */
  async send(message: EmailMessage): Promise<{ readonly id: string }> {
    if (message.to.length === 0 || message.to.length > 50) throw new Error('Email requires between 1 and 50 recipients.');
    if (message.subject.trim() === '') throw new Error('Email requires a subject.');
    if (message.html === undefined && message.text === undefined) throw new Error('Email requires html or text content.');
    const options = message.idempotencyKey === undefined ? undefined : { idempotencyKey: message.idempotencyKey };
    const from = message.from ?? this.defaultFrom;
    const { html, text } = message;
    let payload: ResendPayload;
    if (html === undefined) {
      if (text === undefined) throw new Error('Email requires html or text content.');
      payload = { from, to: [...message.to], subject: message.subject, text };
    } else if (text === undefined) {
      payload = { from, to: [...message.to], subject: message.subject, html };
    } else {
      payload = { from, to: [...message.to], subject: message.subject, html, text };
    }
    try {
      return this.accept(await this.sender(payload, options));
    } catch (error) {
      if (error instanceof EmailSendError) throw error;
      throw new EmailSendError(error instanceof Error ? error.message : 'Email send failed.');
    }
  }

  private accept(result: { readonly data: { readonly id: string } | null; readonly error: { readonly message: string } | null }): {
    readonly id: string;
  } {
    if (result.error !== null) throw new EmailSendError(result.error.message);
    if (result.data === null) throw new EmailSendError('Email send returned no identifier.');
    return Object.freeze({ id: result.data.id });
  }

  /**
   * Registers the address in the Resend audience, resolving duplicates by email.
   *
   * @param contact - Address with optional display name parts.
   * @returns Audience identifier of the created or existing contact.
   * @throws {Error} When the address is blank.
   * @throws {EmailSendError} When the provider rejects the request.
   */
  async upsertContact(contact: EmailContact): Promise<{ readonly id: string }> {
    if (contact.email.trim() === '') throw new Error('Email contact requires an address.');
    const created = await this.contacts
      .create({ email: contact.email, ...(contact.firstName === undefined ? {} : { firstName: contact.firstName }), ...(contact.lastName === undefined ? {} : { lastName: contact.lastName }), unsubscribed: false })
      .catch((error: unknown) => {
        throw new EmailSendError(error instanceof Error ? error.message : 'Email contact request failed.');
      });
    if (created.error === null) {
      if (created.data === null) throw new EmailSendError('Email contact returned no identifier.');
      return Object.freeze({ id: created.data.id });
    }
    const existing = await this.contacts.get({ email: contact.email }).catch((error: unknown) => {
      throw new EmailSendError(error instanceof Error ? error.message : 'Email contact request failed.');
    });
    if (existing.error !== null || existing.data === null) throw new EmailSendError(created.error.message);
    return Object.freeze({ id: existing.data.id });
  }
}

/**
 * Builds the production adapter backed by the Resend SDK.
 *
 * @param apiKey - Resend API key from server-only configuration.
 * @param defaultFrom - Verified sender used when a message omits `from`.
 * @returns Adapter ready for composition.
 */
export function createResendEmailApiAdapter(apiKey: string, defaultFrom: string): ResendEmailApiAdapter {
  const resend = new Resend(apiKey);
  return new ResendEmailApiAdapter(
    (payload, options) => resend.emails.send(payload, options),
    { create: (input) => resend.contacts.create(input), get: (input) => resend.contacts.get(input) },
    defaultFrom,
  );
}
