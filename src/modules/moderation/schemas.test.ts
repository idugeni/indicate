import { describe, expect, it } from 'vitest';

import { reportIntakeSchema, reportSubmitSchema } from '@/modules/moderation/schemas';
import { SLUG_MAX_LENGTH } from '@/modules/site/slug-allocator';

const intake = {
  articleSlug: 'rutan-wonosobo-siap-wbk',
  contact: 'wartawan@example.com',
  category: 'copyright',
  details: 'Foto pada artikel ini tampaknya milik saya, mohon ditinjau redaksi.',
} as const;

describe('reportIntakeSchema', () => {
  it('menerima body yang sah dan menormalkan slug', () => {
    const parsed = reportIntakeSchema.safeParse({ ...intake, articleSlug: '  Rutan-Wonosobo-Siap-WBK  ' });
    expect(parsed.success).toBe(true);
    expect(reportIntakeSchema.parse({ ...intake, articleSlug: ' Rutan-Wonosobo ' }).articleSlug).toBe('rutan-wonosobo');
  });

  it('menolak key asing agar articleId tidak bisa disuntikkan', () => {
    expect(reportIntakeSchema.safeParse({ ...intake, articleId: '00000000-0000-4000-8000-000000000000' }).success).toBe(false);
    expect(reportIntakeSchema.safeParse({ ...intake, orgId: '00000000-0000-4000-8000-000000000000' }).success).toBe(false);
    expect(reportIntakeSchema.safeParse({ ...intake, siteId: '00000000-0000-4000-8000-000000000000' }).success).toBe(false);
  });

  it('menerima slug kosong sebagai laporan tanpa artikel', () => {
    expect(reportIntakeSchema.parse({ ...intake, articleSlug: null }).articleSlug).toBe(null);
    expect(reportIntakeSchema.parse({ ...intake, articleSlug: undefined }).articleSlug).toBe(null);
  });

  it('menolak slug yang tidak pernah menjadi slug tersimpan', () => {
    expect(reportIntakeSchema.safeParse({ ...intake, articleSlug: 'javascript:alert(1)' }).success).toBe(false);
    expect(reportIntakeSchema.safeParse({ ...intake, articleSlug: '../../etc/passwd' }).success).toBe(false);
    expect(reportIntakeSchema.safeParse({ ...intake, articleSlug: 'foo--bar' }).success).toBe(false);
    expect(reportIntakeSchema.safeParse({ ...intake, articleSlug: 'a'.repeat(SLUG_MAX_LENGTH + 1) }).success).toBe(false);
    expect(reportIntakeSchema.safeParse({ ...intake, articleSlug: 42 }).success).toBe(false);
  });

  it('menolak kategori di luar enum', () => {
    expect(reportIntakeSchema.safeParse({ ...intake, category: 'spam' }).success).toBe(false);
  });

  it('menegakkan batas panjang yang sama dengan CHECK constraint database', () => {
    expect(reportIntakeSchema.safeParse({ ...intake, contact: 'ab' }).success).toBe(false);
    expect(reportIntakeSchema.safeParse({ ...intake, contact: 'a'.repeat(321) }).success).toBe(false);
    expect(reportIntakeSchema.safeParse({ ...intake, details: 'pendek' }).success).toBe(false);
    expect(reportIntakeSchema.safeParse({ ...intake, details: 'a'.repeat(4001) }).success).toBe(false);
  });

  it('membatasi articleUrl ke URL http dan https', () => {
    expect(reportIntakeSchema.safeParse({ ...intake, articleUrl: 'https://contoh.example/artikel' }).success).toBe(true);
    expect(reportIntakeSchema.safeParse({ ...intake, articleUrl: 'http://contoh.example/artikel' }).success).toBe(true);
    expect(reportIntakeSchema.safeParse({ ...intake, articleUrl: 'javascript:alert(1)' }).success).toBe(false);
    expect(reportIntakeSchema.safeParse({ ...intake, articleUrl: 'data:text/html,<script>alert(1)</script>' }).success).toBe(false);
    expect(reportIntakeSchema.safeParse({ ...intake, articleUrl: 'ftp://contoh.example/a' }).success).toBe(false);
    expect(reportIntakeSchema.safeParse({ ...intake, articleUrl: 'contoh.example/artikel' }).success).toBe(false);
    expect(reportIntakeSchema.safeParse({ ...intake, articleUrl: `https://contoh.example/${'a'.repeat(2000)}` }).success).toBe(false);
  });
});

describe('reportSubmitSchema', () => {
  const submit = { orgId: '00000000-0000-4000-8000-000000000001', siteId: null, articleId: null, contact: 'wartawan@example.com', category: 'other', details: 'Uraian laporan yang cukup panjang.', articleUrl: null } as const;

  it('menerima body yang sah', () => {
    expect(reportSubmitSchema.safeParse(submit).success).toBe(true);
  });

  it('menegakkan allowlist skema pada articleUrl juga di sisi service', () => {
    expect(reportSubmitSchema.safeParse({ ...submit, articleUrl: 'https://contoh.example/a' }).success).toBe(true);
    expect(reportSubmitSchema.safeParse({ ...submit, articleUrl: 'javascript:alert(1)' }).success).toBe(false);
    expect(reportSubmitSchema.safeParse({ ...submit, articleUrl: 'vbscript:msgbox(1)' }).success).toBe(false);
  });

  it('menolak body tanpa orgId', () => {
    expect(reportSubmitSchema.safeParse({ siteId: null, articleId: null, contact: 'wartawan@example.com', category: 'other', details: 'Uraian laporan yang cukup panjang.', articleUrl: null }).success).toBe(false);
  });
});
