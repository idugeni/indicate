import { describe, expect, it } from 'vitest';

import { TENANT_LEGAL_DOCS } from '@/modules/site/legal-documents';
import { PRIVACY_SECTIONS, TERMS_SECTIONS } from '@/ui/site/marketing-content';

describe('TENANT_LEGAL_DOCS', () => {
  it('mendaftarkan dokumen privasi dan syarat', () => {
    expect(TENANT_LEGAL_DOCS.privacy.title).toBe('Kebijakan Privasi');
    expect(TENANT_LEGAL_DOCS.terms.title).toBe('Syarat & Ketentuan');
  });

  it('menyimpan token interpolasi pada deskripsi', () => {
    expect(TENANT_LEGAL_DOCS.privacy.description).toContain('{siteName}');
    expect(TENANT_LEGAL_DOCS.terms.description).toContain('{siteName}');
  });

  it('memakai master copy bersama tanpa menyalin isi', () => {
    expect(TENANT_LEGAL_DOCS.privacy.sections).toBe(PRIVACY_SECTIONS);
    expect(TENANT_LEGAL_DOCS.terms.sections).toBe(TERMS_SECTIONS);
    for (const doc of Object.values(TENANT_LEGAL_DOCS)) {
      expect(doc.sections.length).toBeGreaterThan(0);
      for (const section of doc.sections) {
        expect(section.heading.length).toBeGreaterThan(0);
        expect(section.body.length).toBeGreaterThan(0);
      }
    }
  });
});
