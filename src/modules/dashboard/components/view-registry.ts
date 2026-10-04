import type { ComponentType } from 'react';
import {
  BarChart3,
  Bot,
  Building2,
  CreditCard,
  FileText,
  Flag,
  FolderKanban,
  Globe,
  KeyRound,
  LayoutDashboard,
  Link2,
  Megaphone,
  Newspaper,
  RefreshCw,
  Share2,
  ShieldAlert,
  Tags,
  Users,
} from 'lucide-react';

import { DASHBOARD_PERMISSIONS } from '@/modules/dashboard/permissions';
import { INTEGRATIONS_PERMISSIONS } from '@/modules/integrations/permissions';

export type IconComponent = ComponentType<{
  className?: string;
  'aria-hidden'?: boolean | 'true' | 'false';
}>;

export type View =
  | 'dashboard'
  | 'configuration'
  | 'publishers'
  | 'editorial'
  | 'taxonomy'
  | 'articles'
  | 'media'
  | 'publishing'
  | 'published'
  | 'ads'
  | 'analytics'
  | 'audit'
  | 'operations'
  | 'settings'
  | 'customers'
  | 'content'
  | 'billing'
  | 'moderation'
  | 'ai';

export interface ViewMetadata {
  /** Short label for navigation chrome: sidebar, breadcrumb, command palette. */
  readonly label: string;
  /** Page heading. Defaults to `label`; only set it when the heading reads better than the nav label. */
  readonly title: string;
  readonly eyebrow: string;
  readonly description: string;
  readonly icon: IconComponent;
  /** Permission gating display; never gate on `roles.tier` (display label only). */
  readonly requiredPermission?: string;
  /** Group heading in the sidebar and category badge in the command palette. */
  readonly group: ViewGroup;
  /**
   * Views whose own panel already presents every collection the payload carries.
   *
   * @remarks Rendering the generic `DataView` underneath them only repeats the
   * same rows in a generic table, so they stay single-surface. `published` is
   * here for a second reason: its payload is `editorial.list`, whose domain
   * projection carries only `{ id, normalizedHostname }` and whose `articleSites`
   * rows carry only ids, so the generic table showed `UNKNOWN` for every domain
   * and a raw UUID for every assignment — broken data, not a thin projection.
   */
  readonly suppressesRawCollections: boolean;
}

export type ViewGroup = 'overview' | 'editorial' | 'publishing' | 'system';

export const VIEW_REGISTRY: Readonly<Record<View, ViewMetadata>> = {
  dashboard: {
    label: 'Beranda', title: 'Ringkasan Ekosistem Redaksi', eyebrow: 'Ringkasan Sistem', group: 'overview',
    description: 'Angka penting jaringan berita Anda: situs, artikel, pengiriman, dan pembaca.',
    icon: LayoutDashboard, suppressesRawCollections: false,
  },
  analytics: {
    label: 'Statistik & Grafik', title: 'Statistik & Grafik', eyebrow: 'Statistik Jaringan', group: 'overview',
    description: 'Grafik pembaca, pengiriman, dan aktivitas per daerah.',
    icon: BarChart3, suppressesRawCollections: false,
  },
  editorial: {
    label: 'Tulis Berita', title: 'Manajemen Artikel & Konten', eyebrow: 'Ruang Kerja Redaksi', group: 'editorial',
    description: 'Tulis dan kelola berita sebelum dikirim ke situs.',
    icon: FileText, suppressesRawCollections: true,
  },
  articles: {
    label: 'Kelola Artikel', title: 'Kelola Artikel Lintas Portal', eyebrow: 'Semua Portal', group: 'editorial',
    description: 'Kelola seluruh artikel jaringan: cari, saring, ubah, dan arsipkan.',
    icon: Newspaper, suppressesRawCollections: true,
  },
  taxonomy: {
    label: 'Kategori & Tag', title: 'Kelola Kategori & Tag', eyebrow: 'Taksonomi Redaksi', group: 'editorial',
    description: 'Atur kanal kategori dan rapikan tag topik di semua artikel.',
    icon: Tags, suppressesRawCollections: true,
  },
  publishers: {
    label: 'Daftar Penerbit', title: 'Daftar Lembaga Penerbit', eyebrow: 'Jaringan Penerbit', group: 'editorial',
    description: 'Kelola lembaga penerbit dan status verifikasinya.',
    icon: Users, suppressesRawCollections: false,
  },
  media: {
    label: 'Media', title: 'Galeri Media', eyebrow: 'Aset Media', group: 'editorial',
    description: 'Kumpulan foto dan gambar untuk berita.',
    icon: FolderKanban, suppressesRawCollections: true,
  },
  publishing: {
    label: 'Antrean Penerbitan', title: 'Antrean Penerbitan', eyebrow: 'Antrean Pengiriman', group: 'publishing',
    description: 'Daftar pengiriman artikel ke situs beserta statusnya.',
    icon: Share2, suppressesRawCollections: true,
  },
  published: {
    label: 'Hasil Tayang', title: 'Hasil Tayang', eyebrow: 'URL Siap Dishare', group: 'publishing',
    description: 'Semua URL artikel yang sudah tayang, bernomor dan siap disalin ke WhatsApp.',
    icon: Link2, suppressesRawCollections: true,
  },
  ads: {
    label: 'Iklan', title: 'Manajemen Iklan', eyebrow: 'Monetisasi Portal', group: 'publishing',
    description: 'Slot per situs, pengiklan, kampanye, kreatif, dan penempatan tayang.',
    icon: Megaphone, requiredPermission: DASHBOARD_PERMISSIONS.siteManage, suppressesRawCollections: true,
  },
  configuration: {
    label: 'Domain & Wilayah', title: 'Domain & Wilayah', eyebrow: 'Pengaturan Domain', group: 'system',
    description: 'Atur domain, subdomain wilayah, dan akses pengguna.',
    icon: Globe, suppressesRawCollections: true,
  },
  settings: {
    label: 'Koneksi & Kunci Akses', title: 'Koneksi & Kunci Akses', eyebrow: 'Kunci & Koneksi', group: 'system',
    description: 'Kunci akses dan surel.',
    icon: KeyRound, requiredPermission: INTEGRATIONS_PERMISSIONS.apiKeyRead, suppressesRawCollections: true,
  },
  billing: {
    label: 'Langganan', title: 'Langganan', eyebrow: 'Tagihan', group: 'system',
    description: 'Status aktivasi organisasi.',
    icon: CreditCard, requiredPermission: INTEGRATIONS_PERMISSIONS.subscriptionRead, suppressesRawCollections: true,
  },
  audit: {
    label: 'Riwayat Keamanan', title: 'Riwayat Keamanan', eyebrow: 'Catatan Keamanan', group: 'system',
    description: 'Riwayat siapa mengubah apa; tidak bisa dihapus.',
    icon: ShieldAlert, requiredPermission: DASHBOARD_PERMISSIONS.auditRead, suppressesRawCollections: false,
  },
  operations: {
    label: 'Tugas Latar Belakang', title: 'Tugas Latar Belakang', eyebrow: 'Tugas Mesin', group: 'system',
    description: 'Pekerjaan mesin di belakang layar: pembersihan dan antrean sistem.',
    icon: RefreshCw, requiredPermission: DASHBOARD_PERMISSIONS.auditRead, suppressesRawCollections: false,
  },
  moderation: {
    label: 'Laporan & Data Pengguna', title: 'Laporan & Data Pengguna', eyebrow: 'Keamanan Konten', group: 'system',
    description: 'Laporan konten bermasalah dan permintaan data pengguna.',
    icon: Flag, requiredPermission: DASHBOARD_PERMISSIONS.auditRead, suppressesRawCollections: true,
  },
  customers: {
    label: 'Kelola Pelanggan', title: 'Kelola Pelanggan', eyebrow: 'Pelanggan & Langganan', group: 'system',
    description: 'Kelola akun pelanggan dan langganannya.',
    icon: Building2, requiredPermission: INTEGRATIONS_PERMISSIONS.superAdmin, suppressesRawCollections: false,
  },
  content: {
    label: 'Konten Website', title: 'Konten Website', eyebrow: 'Halaman Publik', group: 'system',
    description: 'Testimoni, tanya-jawab, dan kontak yang tampil di situs publik.',
    icon: Megaphone, requiredPermission: INTEGRATIONS_PERMISSIONS.contentManage, suppressesRawCollections: true,
  },
  ai: {
    label: 'Asisten AI', title: 'Asisten AI', eyebrow: 'Kontrol AI', group: 'system',
    description: 'Kelola kredensial dan routing model asisten AI.',
    icon: Bot, requiredPermission: INTEGRATIONS_PERMISSIONS.aiManage, suppressesRawCollections: true,
  },
};

export const ALL_VIEWS = Object.keys(VIEW_REGISTRY) as readonly View[];

export const VIEWS_WITHOUT_RAW_COLLECTIONS: ReadonlySet<View> = new Set<View>(
  ALL_VIEWS.filter((view) => VIEW_REGISTRY[view].suppressesRawCollections),
);

const GROUP_TITLES: Readonly<Record<ViewGroup, string>> = {
  overview: 'Ringkasan',
  editorial: 'Redaksi & Konten',
  publishing: 'Penerbitan',
  system: 'Pengaturan Sistem',
};

export function groupTitle(group: ViewGroup): string {
  return GROUP_TITLES[group];
}

export function viewLabel(view: View): string {
  return VIEW_REGISTRY[view].label;
}

/** Ordered nav groups; empty groups are dropped so a low-privilege actor never sees a bare heading. */
export function visibleNavGroups(permissions: ReadonlySet<string>): readonly { readonly id: ViewGroup; readonly title: string; readonly views: readonly View[] }[] {
  const order: readonly ViewGroup[] = ['overview', 'editorial', 'publishing', 'system'];
  return order
    .map((id) => ({
      id,
      title: GROUP_TITLES[id],
      views: ALL_VIEWS.filter((view) => {
        const required = VIEW_REGISTRY[view].requiredPermission;
        return VIEW_REGISTRY[view].group === id && (required === undefined || permissions.has(required));
      }),
    }))
    .filter((group) => group.views.length > 0);
}
