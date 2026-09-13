import type { ComponentType } from 'react';

import type { DashboardSnapshot, RoleTier } from '@/modules/dashboard/models';

export type { DashboardSnapshot };

export type View =
  | 'dashboard'
  | 'configuration'
  | 'publishers'
  | 'editorial'
  | 'media'
  | 'publishing'
  | 'analytics'
  | 'audit'
  | 'operations'
  | 'settings'
  | 'customers'
  | 'content'
  | 'billing'
  | 'moderation';

export type IconComponent = ComponentType<{
  className?: string;
  'aria-hidden'?: boolean | 'true' | 'false';
}>;

export type BadgeVariant = 'default' | 'brass' | 'signal' | 'warning' | 'error';

export interface NavBadge {
  readonly label: string | number;
  readonly variant?: BadgeVariant;
}

/** Membership tier bound to `roles.tier`; `superadmin` is platform-org only (DB trigger guards it). */
export type MemberRole = RoleTier;

export interface NavItem {
  readonly view: View;
  readonly label: string;
  readonly icon: IconComponent;
  readonly href?: string;
  readonly badge?: string | number | NavBadge;
  readonly disabled?: boolean;
  readonly external?: boolean;
  /** Permission gating display; never gate on `roles.tier` (display label only). */
  readonly requiredPermission?: string;
}

export interface NavGroup {
  readonly id: string;
  readonly title: string;
  readonly items: readonly NavItem[];
}

export interface OrganizationOption {
  readonly id: string;
  readonly name: string;
  readonly slug?: string;
  readonly records: readonly string[];
  readonly role?: MemberRole;
  /** Union of org + platform permission names for this org; drives granular nav gating. */
  readonly permissions?: readonly string[];
  readonly status?: 'active' | 'suspended' | 'provisioning';
}

export interface ViewMetadata {
  readonly title: string;
  readonly eyebrow: string;
  readonly description: string;
}

export const VIEW_METADATA_REGISTRY: Record<View, ViewMetadata> = {
  dashboard: {
    title: 'Ringkasan Ekosistem Redaksi',
    eyebrow: 'Control Plane Overview',
    description: 'Status throughput real-time, aktivitas transaksi kanal, dan kesehatan jaringan tenansi.',
  },
  editorial: {
    title: 'Manajemen Artikel & Konten',
    eyebrow: 'Editorial Workspace',
    description: 'Penyusunan naskah kanonikal, penyuntingan metadata terstruktur, dan validasi atribusi.',
  },
  publishing: {
    title: 'Antrean Sindikasi & Penerbitan',
    eyebrow: 'Syndication Queue',
    description: 'Disposisi sinyal publikasi lintas domain dan status propagasi cache invalidasi edge.',
  },
  media: {
    title: 'Penyimpanan Aset Media',
    eyebrow: 'Asset Repository',
    description: 'Repositori gambar editorial terisolasi dengan optimasi WebP dan deduplikasi hash.',
  },
  configuration: {
    title: 'Routing Domain & Regional',
    eyebrow: 'Infrastructure Matrix',
    description: 'Konfigurasi pemetaan host exact, DNS routing tenant, dan aturan isolasi wilayah.',
  },
  publishers: {
    title: 'Direktori Penerbit & Afiliasi',
    eyebrow: 'Publisher Mesh',
    description: 'Pengelolaan entitas penerbit, verifikasi sertifikat redaksi, dan pembagian hak akses.',
  },
  analytics: {
    title: 'Metrik & Throughput Jaringan',
    eyebrow: 'Network Telemetry',
    description: 'Analisis latensi query Postgres, performa edge cache CDN, dan volume pembaca regional.',
  },
  audit: {
    title: 'Log Audit & Keamanan',
    eyebrow: 'Security Ledger',
    description: 'Catatan jejak mutasi data tak terubahkan, perubahan tenansi, dan riwayat otentikasi.',
  },
  operations: {
    title: 'Operasional & Antrean Latar',
    eyebrow: 'Background Operations',
    description: 'Status tugas invalidasi, pembersihan objek, reservasi media, bypass cache, percakapan Telegram, dan klaim replay (read-only).',
  },
  settings: {
    title: 'Kunci API & Integrasi Gateway',
    eyebrow: 'System Configuration',
    description: 'Manajemen secret token, webhook telegram dispatcher, dan endpoint edge upstream.',
  },
  customers: {
    title: 'Pengelolaan Akun & Langganan',
    eyebrow: 'Billing & Tenancy',
    description: 'Alokasi kuota kapasitas situs regional, status lisensi node, dan data organisasi.',
  },
  content: {
    title: 'Konten Dinamis & Tema',
    eyebrow: 'Platform Content',
    description: 'Testimoni, FAQ, etalase media, kanal kontak, dan preset tema yang tayang di situs publik.',
  },
  billing: {
    title: 'Langganan',
    eyebrow: 'Billing',
    description: 'Status aktivasi organisasi.',
  },
  moderation: {
    title: 'Moderasi & Hak Data',
    eyebrow: 'Trust & Safety',
    description: 'Laporan konten publik dengan SLA 1x24 jam dan tiket permintaan data (DSAR) dengan SLA 30 hari.',
  },
};