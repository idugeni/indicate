import { describe, expect, it, vi } from 'vitest';

import { EmailWelcomeService, buildWelcomeEmail } from '@/modules/integrations/email-welcome-service';

describe('buildWelcomeEmail', () => {
  it('greets by display name in subject and bodies', () => {
    const content = buildWelcomeEmail('Elsa');
    expect(content.subject).toContain('Indicate');
    expect(content.text).toContain('Elsa');
    expect(content.html).toContain('Elsa');
  });

  it('falls back when the display name is blank', () => {
    const content = buildWelcomeEmail('   ');
    expect(content.text).toContain('Selamat datang di Indicate!');
  });
});

describe('EmailWelcomeService', () => {
  it('registers the contact then sends exactly once per user', async () => {
    const port = { send: vi.fn(async () => ({ id: 'email-1' })), upsertContact: vi.fn(async () => ({ id: 'contact-1' })) };
    const service = new EmailWelcomeService(port);
    const result = await service.welcome({ authUserId: 'user-1', email: 'reader@example.com', displayName: 'Reader' });
    expect(result).toEqual({ sent: true });
    expect(port.upsertContact).toHaveBeenCalledWith({ email: 'reader@example.com', firstName: 'Reader' });
    expect(port.send).toHaveBeenCalledWith(expect.objectContaining({ to: ['reader@example.com'], idempotencyKey: 'welcome/user-1' }));
  });

  it('stays silent without a configured port', async () => {
    const service = new EmailWelcomeService(null);
    await expect(service.welcome({ authUserId: 'user-1', email: 'reader@example.com', displayName: 'Reader' })).resolves.toEqual({
      sent: false,
    });
  });

  it('never throws on provider failure', async () => {
    const port = {
      send: vi.fn(async () => {
        throw new Error('provider down');
      }),
      upsertContact: vi.fn(async () => ({ id: 'contact-1' })),
    };
    const service = new EmailWelcomeService(port);
    await expect(service.welcome({ authUserId: 'user-1', email: 'reader@example.com', displayName: 'Reader' })).resolves.toEqual({
      sent: false,
    });
  });
});
