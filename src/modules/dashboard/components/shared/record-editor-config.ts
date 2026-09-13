'use client';

import { DASHBOARD_PERMISSION_NAMES } from '@/modules/dashboard/permissions';
import { INTEGRATIONS_TENANT_PERMISSION_NAMES } from '@/modules/integrations/permissions';
import { PUBLISHING_PERMISSION_NAMES } from '@/modules/publishing/permissions';

/**
 * Registri konfigurasi editor rekaman generik untuk DataView.
 *
 * Setiap entri memetakan satu collection key dari respons workspace API
 * (`GET /api/dashboard/workspace`) ke aksi update yang sudah tersedia di
 * `TenantBusinessService` beserta definisi field-nya. Bentuk payload
 * mengikuti skema Zod di `@/modules/dashboard/schemas` (selalu membawa
 * `id` + `expectedVersion` untuk optimistic concurrency).
 *
 * Koleksi yang sengaja dikecualikan dari tahap ini:
 * - `siteSettings` — muatan JSON berat (colors/seo/navigation), punya form khusus.
 * - `articleSites`, `media`, `jobs`, `targets`, `auditLogs` — read-only atau
 *   dikelola form khusus (EditorialForm/PublishingForm/MediaForm).
 * - Koleksi endpoint integrations (`apiKeys`, `subscription`, `telegramMappings`)
 *   memakai command path berbeda, belum tercakup command workspace di DataView.
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
  /** Opsi statis untuk field select. */
  readonly options?: readonly EditorOption[];
  /** Ambil opsi dari koleksi lain dalam respons yang sama (untuk select relasi). */
  readonly optionSource?: EditorOptionSource;
  /** Jika true, select boleh kosong yang berarti `null` (relasi opsional). */
  readonly allowEmpty?: boolean;
  readonly emptyLabel?: string;
}

export interface EditorTransition {
  readonly action: string;
  readonly label: string;
  /** Status item yang membuat transisi ini relevan; undefined = selalu tampil. */
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

/** Katalog permission yang diakui backend (`isDashboardPermission`): gabungan tenant. */
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
      { key: 'normalizedHostname', label: 'Hostname apex', kind: 'text', required: true, placeholder: 'beritakota.news' },
      { key: 'status', label: 'Status', kind: 'select', required: true, options: LIFECYCLE_OPTIONS },
    ],
  },
  regions: {
    updateAction: 'region.update',
    title: 'Ubah wilayah',
    fields: [
      { key: 'name', label: 'Nama wilayah', kind: 'text', required: true, placeholder: 'Wonosobo' },
      { key: 'slug', label: 'Slug', kind: 'text', required: true, placeholder: 'wonosobo', pattern: '[a-z0-9-]+' },
      { key: 'externalKey', label: 'Kunci eksternal', kind: 'text', required: true, placeholder: 'wonosobo', pattern: '[a-z0-9-]+' },
      { key: 'status', label: 'Status', kind: 'select', required: true, options: LIFECYCLE_OPTIONS },
    ],
  },
  sites: {
    updateAction: 'site.update',
    title: 'Ubah kanal',
    fields: [
      { key: 'domainId', label: 'Domain induk', kind: 'select', required: true, optionSource: 'domains' },
      { key: 'regionId', label: 'Wilayah', kind: 'select', optionSource: 'regions', allowEmpty: true, emptyLabel: 'Kanal apex (sentral)' },
      { key: 'normalizedHostname', label: 'Hostname', kind: 'text', required: true, placeholder: 'pekalongan.wartakota.tv' },
      { key: 'status', label: 'Status', kind: 'select', required: true, options: LIFECYCLE_OPTIONS },
    ],
  },
  categories: {
    updateAction: 'category.update',
    title: 'Ubah kategori',
    fields: [
      { key: 'name', label: 'Nama', kind: 'text', required: true },
      { key: 'slug', label: 'Slug', kind: 'text', required: true, pattern: '[a-z0-9-]+' },
      { key: 'status', label: 'Status', kind: 'select', required: true, options: LIFECYCLE_OPTIONS },
    ],
  },
  authors: {
    updateAction: 'author.update',
    title: 'Ubah penulis',
    fields: [
      { key: 'displayName', label: 'Nama tampilan', kind: 'text', required: true },
      { key: 'byline', label: 'Byline', kind: 'text', required: true },
      { key: 'status', label: 'Status', kind: 'select', required: true, options: LIFECYCLE_OPTIONS },
    ],
  },
  publishers: {
    updateAction: 'publisher.update',
    title: 'Ubah penerbit',
    fields: [
      { key: 'name', label: 'Nama resmi', kind: 'text', required: true },
      { key: 'type', label: 'Klasifikasi entitas', kind: 'select', required: true, options: PUBLISHER_TYPE_OPTIONS },
      { key: 'attributionLabel', label: 'Label atribusi kanonikal', kind: 'text', required: true },
      { key: 'evidenceReference', label: 'Referensi bukti (opsional)', kind: 'text', placeholder: 'ref-dewanpers-2026-09' },
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
    title: 'Ubah naskah',    fields: [
      { key: 'title', label: 'Judul', kind: 'text', required: true },
      { key: 'slug', label: 'Slug', kind: 'text', required: true, pattern: '[a-z0-9-]+' },
      { key: 'regionId', label: 'Wilayah induk', kind: 'select', required: true, optionSource: 'regions' },
      { key: 'publisherId', label: 'Penerbit', kind: 'select', optionSource: 'publishers', allowEmpty: true, emptyLabel: 'Tanpa penerbit' },
      { key: 'categoryId', label: 'Kategori', kind: 'select', optionSource: 'categories', allowEmpty: true, emptyLabel: 'Tanpa kategori' },
      { key: 'authorId', label: 'Penulis', kind: 'select', optionSource: 'authors', allowEmpty: true, emptyLabel: 'Tanpa penulis' },
      { key: 'source', label: 'Sumber', kind: 'text', required: true },
      { key: 'status', label: 'Status', kind: 'select', required: true, options: ARTICLE_STATUS_OPTIONS },
      { key: 'body', label: 'Isi naskah', kind: 'textarea', required: true },
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

/** Nilai awal form dari rekaman API (array claimScopes digabung per baris). */
export function initialFieldValue(field: EditorField, item: Record<string, unknown>): string | boolean | readonly string[] {
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
 * Susun payload `*.update` dari nilai form. Field relasi opsional yang
 * dikosongkan dikirim sebagai `null` sesuai skema nullable di backend.
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
      const contacts = item.contacts;
      return {
        id, expectedVersion, name: text('name'), type: text('type'), attributionLabel: text('attributionLabel'),
        contacts: typeof contacts === 'object' && contacts !== null ? contacts : {},
        evidenceReference: evidence === '' ? null : evidence,
      };
    }
    case 'affiliations':
      return {
        id, expectedVersion, institutionName: text('institutionName'), claimScopes: [...lines(values.claimScopes ?? '')],
        evidenceReference: text('evidenceReference'), active: values.active === true,
      };
    case 'articles':
      return {
        id, expectedVersion, regionId: text('regionId'), publisherId: nullableId('publisherId'),
        categoryId: nullableId('categoryId'), authorId: nullableId('authorId'), slug: lower('slug'),
        title: text('title'), body: String(values.body ?? '').trim(), source: text('source'), status: text('status'),
      };
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
