import { describe, expect, it } from 'vitest';

import { apiKeyIssueSchema } from '@/modules/integrations/schemas';

describe('apiKeyIssueSchema scopes', () => {
  it('mendedup dan mengurutkan scope', () => {
    const parsed = apiKeyIssueSchema.safeParse({ name: 'k', scopes: ['sites.manage', 'articles.read', 'sites.manage'] });
    expect(parsed.success).toBe(true);
    if (!parsed.success) throw new Error('expected ok');
    expect(parsed.data.scopes).toEqual(['articles.read', 'sites.manage']);
  });

  it('menolak scope kosong', () => {
    expect(apiKeyIssueSchema.safeParse({ name: 'k', scopes: [] }).success).toBe(false);
    expect(apiKeyIssueSchema.safeParse({ name: 'k', scopes: ['  '] }).success).toBe(false);
  });
});
