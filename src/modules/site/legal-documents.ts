import type { DocSectionItem } from '@/modules/site/components/layout/content';
import { PRIVACY_SECTIONS, TERMS_SECTIONS } from '@/ui/site/marketing-content';

export interface TenantLegalDoc {
  readonly title: string;
  readonly description: string;
  readonly sections: readonly DocSectionItem[];
}

/**
 * Register dokumen legal tenant: satu master copy untuk semua host,
 * token `{domain}` / `{siteName}` diinterpolasi per request.
 */
export const TENANT_LEGAL_DOCS: Record<'privacy' | 'terms', TenantLegalDoc> = {
  privacy: {
    title: 'Kebijakan Privasi',
    description: 'Kebijakan privasi {siteName}: pengelolaan data, dasar hukum UU PDP, dan hak subjek data.',
    sections: PRIVACY_SECTIONS,
  },
  terms: {
    title: 'Syarat & Ketentuan',
    description: 'Syarat dan ketentuan penggunaan layanan portal {siteName}.',
    sections: TERMS_SECTIONS,
  },
};
