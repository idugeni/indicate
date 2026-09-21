import type { DocSectionItem } from '@/modules/site/components/layout/content';
import { PRIVACY_SECTIONS, TERMS_SECTIONS } from '@/ui/site/marketing-content';

export interface TenantLegalDoc {
  readonly title: string;
  readonly description: string;
  readonly sections: readonly DocSectionItem[];
  readonly effectiveDate: string;
}

/**
 * Cross-links between tenant documents for the Related documents box.
 */
export const TENANT_RELATED_DOCS: readonly { readonly label: string; readonly href: string }[] = [
  { label: 'Kebijakan Privasi', href: '/kebijakan-privasi' },
  { label: 'Syarat & Ketentuan', href: '/syarat-ketentuan' },
  { label: 'Kontak', href: '/kontak' },
  { label: 'Laporkan Konten', href: '/report' },
];
/**
 * Tenant legal document registry: one master copy for all hosts,
 * with `{domain}` / `{siteName}` tokens interpolated per request.
 */
export const TENANT_LEGAL_DOCS: Record<'privacy' | 'terms', TenantLegalDoc> = {
  privacy: {
    title: 'Kebijakan Privasi',
    description: 'Kebijakan privasi {siteName}: pengelolaan data, dasar hukum UU PDP, dan hak subjek data.',
    sections: PRIVACY_SECTIONS,
    effectiveDate: '5 September 2026',
  },
  terms: {
    title: 'Syarat & Ketentuan',
    description: 'Syarat dan ketentuan penggunaan layanan portal {siteName}.',
    sections: TERMS_SECTIONS,
    effectiveDate: '7 September 2026',
  },
};
