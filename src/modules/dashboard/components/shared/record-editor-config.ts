'use client';

import { DASHBOARD_PERMISSION_NAMES } from '@/modules/dashboard/permissions';
import { INTEGRATIONS_TENANT_PERMISSION_NAMES } from '@/modules/integrations/permissions';
import { PUBLISHING_PERMISSION_NAMES } from '@/modules/publishing/permissions';
import { SOCIAL_FIELD_DEFS, SOCIAL_ORDER } from '@/modules/site/company-contact';

/**
 * Generic record-editor configuration registry for DataView.
 *
 * Each entry maps one collection key from the workspace API response
 * (`GET /api/dashboard/workspace`) to the already-available update action in
 * `TenantBusinessService` plus its field definitions. Payload shape
 * follows the Zod schemas in `@/modules/dashboard/schemas` (always carrying
 * `id` + `expectedVersion` for optimistic concurrency).
 *
 * Collections deliberately excluded at this stage:
 * - `siteSettings` — heavy JSON payload (colors/seo/navigation) with a dedicated form.
 * - `articleSites`, `media`, `jobs`, `targets`, `auditLogs` — read-only or
 *   managed by dedicated forms (ArticleCreateForm/ArticleDistributeForm/PublishingForm/MediaForm).
 * - Integrations endpoint collections (`apiKeys`, `subscription`, `telegramMappings`)
 *   use a different command path, not yet covered by workspace commands in DataView.
 */

export type EditorFieldKind = 'text' | 'textarea' | 'select' | 'checkbox' | 'checklist' | 'static';

export type EditorOptionSource =
  | 'domains'
  | 'regions'
  | 'publishers'
  | 'categories'
  | 'authors'
  | 'roles';

export type EditorValues = Readonly<Record<string, string | boolean | readonly string[]>>;

export interface EditorOption {
  readonly value: string;
  readonly label: string;
}

export interface EditorField {
  readonly key: string;
  readonly label: string;
  readonly kind: EditorFieldKind;
  readonly required?: boolean;
  readonly placeholder?: string;
  readonly pattern?: string;
  /** Static options for a select field. */
  readonly options?: readonly EditorOption[];
  /** Pull options from another collection in the same response (for relation selects). */
  readonly optionSource?: EditorOptionSource;
  /** When true, the select may be left empty meaning `null` (optional relation). */
  readonly allowEmpty?: boolean;
  readonly emptyLabel?: string;
}

export interface EditorTransition {
  readonly action: string;
  readonly label: string;
  /** Item status that makes this transition relevant; undefined = always shown. */
  readonly whenStatus?: readonly string[];
}

export interface EditorConfig {
  readonly updateAction: string;
  readonly title: string;
  readonly fields: readonly EditorField[];
  readonly transitions?: readonly EditorTransition[];
}

const LIFECYCLE_OPTIONS: readonly EditorOption[] = [
  { value: 'active', label: 'Aktif' },
  { value: 'inactive', label: 'Nonaktif' },
  { value: 'archived', label: 'Diarsipkan' },
];

const ARTICLE_STATUS_OPTIONS: readonly EditorOption[] = [
  { value: 'draft', label: 'Draf' },
  { value: 'in_review', label: 'Tinjauan' },
  { value: 'scheduled', label: 'Terjadwal' },
  { value: 'active', label: 'Aktif' },
];

const PUBLISHER_TYPE_OPTIONS: readonly EditorOption[] = [
  { value: 'government_institution', label: 'Institusi pemerintah' },
  { value: 'correctional_institution', label: 'Lembaga pemasyarakatan' },
  { value: 'public_relations_office', label: 'Humas / keprotokolan' },
  { value: 'company', label: 'Perusahaan' },
  { value: 'organization', label: 'Organisasi' },
  { value: 'community', label: 'Komunitas' },
  { value: 'independent_publisher', label: 'Penerbit independen' },
];

/** Permission catalog recognized by the backend (`isDashboardPermission`): combined tenant set. */
export const ROLE_PERMISSION_OPTIONS: readonly EditorOption[] = Object.freeze(
  [...new Set([...DASHBOARD_PERMISSION_NAMES, ...PUBLISHING_PERMISSION_NAMES, ...INTEGRATIONS_TENANT_PERMISSION_NAMES])].map(
    (name) => ({ value: name, label: name }),
  ),
);

const ROLE_TIER_OPTIONS: readonly EditorOption[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'user', label: 'Anggota' },
];

const EDITOR_CONFIGS: Readonly<Record<string, EditorConfig>> = {
  domains: {
    updateAction: 'domain.update',
    title: 'Ubah domain',
    fields: [
      { key: 'normalizedHostname', label: 'Nama domain utama', kind: 'text', required: true, placeholder: 'beritakota.news' },
      { key: 'status', label: 'Status', kind: 'select', required: true, options: LIFECYCLE_OPTIONS },
    ],
  },
  regions: {
    updateAction: 'region.update',
    title: 'Ubah wilayah',
    fields: [
      { key: 'name', label: 'Nama wilayah', kind: 'text', required: true, placeholder: 'Wonosobo' },
      { key: 'slug', label: 'Kode Wilayah', kind: 'text', required: true, placeholder: 'wonosobo', pattern: '[a-z0-9-]+' },
      { key: 'externalKey', label: 'Kode Eksternal', kind: 'text', required: true, placeholder: 'wonosobo', pattern: '[a-z0-9-]+' },
      { key: 'status', label: 'Status', kind: 'select', required: true, options: LIFECYCLE_OPTIONS },
    ],
  },
  sites: {
    updateAction: 'site.update',
    title: 'Ubah situs',
    fields: [
      { key: 'domainId', label: 'Domain', kind: 'select', required: true, optionSource: 'domains' },
      { key: 'regionId', label: 'Wilayah', kind: 'select', optionSource: 'regions', allowEmpty: true, emptyLabel: 'Domain utama (tanpa wilayah)' },
      { key: 'normalizedHostname', label: 'Alamat Situs', kind: 'text', required: true, placeholder: 'pekalongan.wartakota.tv' },
      { key: 'status', label: 'Status', kind: 'select', required: true, options: LIFECYCLE_OPTIONS },
    ],
  },
  categories: {
    updateAction: 'category.update',
    title: 'Ubah kategori',
    fields: [
      { key: 'name', label: 'Nama', kind: 'text', required: true },
      { key: 'slug', label: 'Kode Kategori', kind: 'text', required: true, pattern: '[a-z0-9-]+' },
      { key: 'status', label: 'Status', kind: 'select', required: true, options: LIFECYCLE_OPTIONS },
    ],
  },
  authors: {
    updateAction: 'author.update',
    title: 'Ubah penulis',
    fields: [
      { key: 'displayName', label: 'Nama tampilan', kind: 'text', required: true },
      { key: 'byline', label: 'Nama pena', kind: 'text', required: true },
      { key: 'status', label: 'Status', kind: 'select', required: true, options: LIFECYCLE_OPTIONS },
    ],
  },
  publishers: {
    updateAction: 'publisher.update',
    title: 'Ubah penerbit',
    fields: [
      { key: 'name', label: 'Nama resmi', kind: 'text', required: true },
      { key: 'type', label: 'Jenis Penerbit', kind: 'select', required: true, options: PUBLISHER_TYPE_OPTIONS },
      { key: 'attributionLabel', label: 'Nama Tampil', kind: 'text', required: true },
      { key: 'evidenceReference', label: 'Referensi bukti (opsional)', kind: 'text', placeholder: 'ref-dewanpers-2026-09' },
      ...SOCIAL_FIELD_DEFS.map((field) => ({
        key: `contacts.${field.key}`,
        label: `${field.label} (URL, opsional)`,
        kind: 'text' as const,
        placeholder: field.placeholder,
      })),
    ],
  },
  affiliations: {
    updateAction: 'affiliation.update',
    title: 'Ubah afiliasi resmi',
    fields: [
      { key: 'institutionName', label: 'Nama institusi', kind: 'text', required: true },
      { key: 'claimScopes', label: 'Cakupan klaim (satu per baris)', kind: 'textarea', required: true },
      { key: 'evidenceReference', label: 'Referensi bukti', kind: 'text', required: true },
      { key: 'active', label: 'Afiliasi aktif', kind: 'checkbox' },
    ],
  },
  articles: {
    updateAction: 'article.update',
    title: 'Ubah Artikel',    fields: [
      { key: 'title', label: 'Judul', kind: 'text', required: true },
      { key: 'slug', label: 'Slug URL', kind: 'text', required: true, pattern: '[a-z0-9-]+' },
      { key: 'regionId', label: 'Wilayah', kind: 'select', required: true, optionSource: 'regions' },
      { key: 'publisherId', label: 'Penerbit', kind: 'select', optionSource: 'publishers', allowEmpty: true, emptyLabel: 'Tanpa penerbit' },
      { key: 'categoryId', label: 'Kategori', kind: 'select', optionSource: 'categories', allowEmpty: true, emptyLabel: 'Tanpa kategori' },
      { key: 'authorId', label: 'Penulis', kind: 'select', optionSource: 'authors', allowEmpty: true, emptyLabel: 'Tanpa penulis' },
      { key: 'source', label: 'Sumber', kind: 'text', required: true },
      { key: 'status', label: 'Status', kind: 'select', required: true, options: ARTICLE_STATUS_OPTIONS },
      { key: 'excerpt', label: 'Deskripsi (opsional)', kind: 'textarea', placeholder: 'Ringkasan ≤ 500 karakter; kosong = dari isi' },
      { key: 'canonicalUrl', label: 'URL kanonis (opsional)', kind: 'text', placeholder: 'https://…' },
      { key: 'scheduledAt', label: 'Jadwal terbit (ISO, opsional)', kind: 'text', placeholder: '2026-10-01T07:00:00.000Z' },
      { key: 'body', label: 'Isi Artikel', kind: 'textarea', required: true },
    ],
    transitions: [
      { action: 'article.archive', label: 'Arsipkan', whenStatus: ['draft', 'active'] },
      { action: 'article.restore', label: 'Pulihkan ke draf', whenStatus: ['archived'] },
    ],
  },
  roles: {
    updateAction: 'role.update',
    title: 'Ubah peran',
    fields: [
      { key: 'name', label: 'Nama peran', kind: 'text', required: true },
      { key: 'tier', label: 'Tingkat', kind: 'select', required: true, options: ROLE_TIER_OPTIONS },
      { key: 'active', label: 'Peran aktif', kind: 'checkbox' },
      { key: 'permissions', label: 'Hak akses', kind: 'checklist', required: true, options: ROLE_PERMISSION_OPTIONS },
    ],
  },
  memberships: {
    updateAction: 'membership.update',
    title: 'Ubah keanggotaan',
    fields: [
      { key: 'userId', label: 'ID pengguna', kind: 'static' },
      { key: 'roleId', label: 'Peran', kind: 'select', required: true, optionSource: 'roles' },
      { key: 'status', label: 'Status', kind: 'select', required: true, options: LIFECYCLE_OPTIONS },
    ],
  },
};

export function getEditorConfig(collectionKey: string): EditorConfig | undefined {
  return EDITOR_CONFIGS[collectionKey];
}

export type LookupTables = Readonly<Record<string, readonly Record<string, unknown>[] | undefined>>;

function lookupLabel(source: EditorOptionSource, item: Record<string, unknown>): string {
  const fallback = String(item.id ?? 'tanpa-nama');
  if (source === 'domains') {
    const hostname = item.normalizedHostname;
    return typeof hostname === 'string' && hostname !== '' ? hostname : fallback;
  }
  if (source === 'regions' || source === 'categories' || source === 'roles') {
    const name = item.name;
    return typeof name === 'string' && name !== '' ? name : fallback;
  }
  if (source === 'publishers') {
    const name = item.name;
    return typeof name === 'string' && name !== '' ? name : fallback;
  }
  const displayName = item.displayName;
  return typeof displayName === 'string' && displayName !== '' ? displayName : fallback;
}

export function resolveFieldOptions(field: EditorField, lookups: LookupTables): readonly EditorOption[] {
  if (field.options !== undefined) return field.options;
  if (field.optionSource === undefined) return [];
  const rows = lookups[field.optionSource] ?? [];
  return rows.map((row) => ({ value: String(row.id ?? ''), label: lookupLabel(field.optionSource as EditorOptionSource, row) }));
}

/** Initial form value from the API record (claimScopes array joined one per line). */
export function initialFieldValue(field: EditorField, item: Record<string, unknown>): string | boolean | readonly string[] {
  if (field.key.startsWith('contacts.')) {
    const contacts = item.contacts;
    if (typeof contacts === 'object' && contacts !== null) {
      const raw = (contacts as Record<string, unknown>)[field.key.slice('contacts.'.length)];
      return typeof raw === 'string' ? raw : '';
    }
    return '';
  }
  const raw = item[field.key];
  if (field.kind === 'checkbox') return raw === true;
  if (field.kind === 'checklist') {
    return Array.isArray(raw) ? raw.filter((entry): entry is string => typeof entry === 'string') : [];
  }
  if (Array.isArray(raw)) {
    return raw.filter((entry): entry is string => typeof entry === 'string').join('\n');
  }
  if (raw === null || raw === undefined) return '';
  return String(raw);
}

function lines(value: string | boolean | readonly string[] | undefined): readonly string[] {
  if (Array.isArray(value)) return value.filter((entry): entry is string => typeof entry === 'string');
  if (typeof value !== 'string') return [];
  return value.split('\n').map((line) => line.trim()).filter(Boolean);
}

/**
 * Build the `*.update` payload from form values. Optional relation fields left
 * empty are sent as `null` per the backend nullable schema.
 */
export function buildUpdatePayload(
  collectionKey: string,
  item: Record<string, unknown>,
  values: EditorValues,
): Record<string, unknown> {
  const id = String(item.id ?? '');
  const expectedVersion = Number(item.version ?? 1);
  const text = (key: string): string => String(values[key] ?? '').trim();
  const lower = (key: string): string => text(key).toLowerCase();
  const nullableId = (key: string): string | null => {
    const value = text(key);
    return value === '' ? null : value;
  };

  switch (collectionKey) {
    case 'domains':
      return { id, expectedVersion, normalizedHostname: lower('normalizedHostname'), status: text('status') };
    case 'regions':
      return { id, expectedVersion, externalKey: lower('externalKey'), name: text('name'), slug: lower('slug'), status: text('status') };
    case 'sites':
      return { id, expectedVersion, domainId: text('domainId'), regionId: nullableId('regionId'), normalizedHostname: lower('normalizedHostname'), status: text('status') };
    case 'categories':
      return { id, expectedVersion, name: text('name'), slug: lower('slug'), status: text('status') };
    case 'authors':
      return { id, expectedVersion, displayName: text('displayName'), byline: text('byline'), status: text('status') };
    case 'publishers': {
      const evidence = text('evidenceReference');
      const stored = item.contacts;
      const contacts: Record<string, string> =
        typeof stored === 'object' && stored !== null
          ? Object.fromEntries(
              Object.entries(stored).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
            )
          : {};
      for (const platform of SOCIAL_ORDER) {
        const value = String(values[`contacts.${platform}`] ?? '').trim();
        if (value === '') delete contacts[platform];
        else contacts[platform] = value;
      }
      return {
        id, expectedVersion, name: text('name'), type: text('type'), attributionLabel: text('attributionLabel'),
        contacts,
        evidenceReference: evidence === '' ? null : evidence,
      };
    }
    case 'affiliations':
      return {
        id, expectedVersion, institutionName: text('institutionName'), claimScopes: [...lines(values.claimScopes ?? '')],
        evidenceReference: text('evidenceReference'), active: values.active === true,
      };
    case 'articles': {
      const optionalText = (key: string): string | null => {
        const value = text(key);
        return value === '' ? null : value;
      };
      return {
        id, expectedVersion, regionId: text('regionId'), publisherId: nullableId('publisherId'),
        categoryId: nullableId('categoryId'), authorId: nullableId('authorId'), slug: lower('slug'),
        title: text('title'), excerpt: optionalText('excerpt'),
        canonicalUrl: optionalText('canonicalUrl'), body: String(values.body ?? '').trim(), source: text('source'),
        status: text('status'), scheduledAt: optionalText('scheduledAt'),
      };
    }
    case 'roles':
      return {
        id, expectedVersion, name: text('name'), tier: text('tier'), active: values.active === true,
        permissions: [...lines(values.permissions)],
      };
    case 'memberships':
      return { userId: String(item.userId ?? ''), roleId: text('roleId'), status: text('status'), expectedVersion };
    default:
      return { id, expectedVersion };
  }
}
