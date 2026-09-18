import { describe, expect, it } from 'vitest';

import { API_COMMANDS, apiCommandScope } from '@/modules/integrations/api-command-scopes';

describe('API_COMMANDS', () => {
  it('mendaftarkan sembilan aksi publik', () => {
    expect(API_COMMANDS).toHaveLength(9);
    expect(API_COMMANDS).toContain('article.create');
    expect(API_COMMANDS).toContain('publication.status');
    expect(new Set(API_COMMANDS).size).toBe(API_COMMANDS.length);
  });
});

describe('apiCommandScope', () => {
  it('memetakan aksi artikel ke article.manage', () => {
    expect(apiCommandScope('article.create')).toBe('article.manage');
  });

  it('memetakan aksi media ke media.manage', () => {
    expect(apiCommandScope('media.reserve')).toBe('media.manage');
    expect(apiCommandScope('media.complete')).toBe('media.manage');
  });

  it('memetakan status publikasi ke publishing.read', () => {
    expect(apiCommandScope('publication.status')).toBe('publishing.read');
  });

  it('memetakan sisa aksi publikasi ke publishing.request', () => {
    expect(apiCommandScope('publication.request')).toBe('publishing.request');
    expect(apiCommandScope('publication.requestBulk')).toBe('publishing.request');
    expect(apiCommandScope('publication.suggest')).toBe('publishing.request');
    expect(apiCommandScope('publication.retry')).toBe('publishing.request');
    expect(apiCommandScope('publication.unpublish')).toBe('publishing.request');
  });
});
