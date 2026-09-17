import { describe, expect, it, vi } from 'vitest';

import { ResendEmailApiAdapter } from '@/integrations/email/resend-email-api';
import { EmailSendError } from '@/modules/integrations/ports';

function successSender(id = 'email-id') {
  return vi.fn(async () => ({ data: { id }, error: null }));
}

function successContacts(id = 'contact-id') {
  return {
    create: vi.fn(async () => ({ data: { id }, error: null })),
    get: vi.fn(async () => ({ data: { id }, error: null })),
  };
}

const DEFAULT_FROM = 'Indicate <noreply@indicate.web.id>';

describe('ResendEmailApiAdapter', () => {
  it('defaults the sender address', async () => {
    const sender = successSender();
    const adapter = new ResendEmailApiAdapter(sender, successContacts(), DEFAULT_FROM);
    const result = await adapter.send({ to: ['reader@example.com'], subject: 'Hello', text: 'Hi' });
    expect(result).toEqual({ id: 'email-id' });
    expect(sender).toHaveBeenCalledWith(
      { from: DEFAULT_FROM, to: ['reader@example.com'], subject: 'Hello', text: 'Hi' },
      undefined,
    );
  });

  it('prefers an explicit sender and forwards the idempotency key', async () => {
    const sender = successSender();
    const adapter = new ResendEmailApiAdapter(sender, successContacts(), DEFAULT_FROM);
    await adapter.send({
      to: ['reader@example.com'],
      subject: 'Hello',
      html: '<p>Hi</p>',
      from: 'News <news@indicate.web.id>',
      idempotencyKey: 'welcome/reader-1',
    });
    expect(sender).toHaveBeenCalledWith(
      { from: 'News <news@indicate.web.id>', to: ['reader@example.com'], subject: 'Hello', html: '<p>Hi</p>' },
      { idempotencyKey: 'welcome/reader-1' },
    );
  });

  it('wraps provider rejections in EmailSendError', async () => {
    const sender = vi.fn(async () => ({ data: null, error: { message: 'Invalid from address.', name: 'validation_error' } }));
    const adapter = new ResendEmailApiAdapter(sender, successContacts(), DEFAULT_FROM);
    await expect(adapter.send({ to: ['reader@example.com'], subject: 'Hello', text: 'Hi' })).rejects.toBeInstanceOf(EmailSendError);
  });

  it('rejects messages without recipients, subject, or body', async () => {
    const adapter = new ResendEmailApiAdapter(successSender(), successContacts(), DEFAULT_FROM);
    await expect(adapter.send({ to: [], subject: 'Hello', text: 'Hi' })).rejects.toThrow();
    await expect(adapter.send({ to: ['reader@example.com'], subject: '  ', text: 'Hi' })).rejects.toThrow();
    await expect(adapter.send({ to: ['reader@example.com'], subject: 'Hello' })).rejects.toThrow();
  });

  it('creates a new audience contact', async () => {
    const contacts = successContacts('contact-1');
    const adapter = new ResendEmailApiAdapter(successSender(), contacts, DEFAULT_FROM);
    const result = await adapter.upsertContact({ email: 'reader@example.com', firstName: 'Reader' });
    expect(result).toEqual({ id: 'contact-1' });
    expect(contacts.create).toHaveBeenCalledWith({ email: 'reader@example.com', firstName: 'Reader', unsubscribed: false });
    expect(contacts.get).not.toHaveBeenCalled();
  });

  it('resolves duplicate contacts by email', async () => {
    const contacts = {
      create: vi.fn(async () => ({ data: null, error: { message: 'Contact already exists.', name: 'conflict' } })),
      get: vi.fn(async () => ({ data: { id: 'contact-9' }, error: null })),
    };
    const adapter = new ResendEmailApiAdapter(successSender(), contacts, DEFAULT_FROM);
    const result = await adapter.upsertContact({ email: 'reader@example.com' });
    expect(result).toEqual({ id: 'contact-9' });
    expect(contacts.get).toHaveBeenCalledWith({ email: 'reader@example.com' });
  });

  it('rejects blank contact addresses', async () => {
    const adapter = new ResendEmailApiAdapter(successSender(), successContacts(), DEFAULT_FROM);
    await expect(adapter.upsertContact({ email: '  ' })).rejects.toThrow();
  });
});
