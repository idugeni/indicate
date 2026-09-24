import type { ComponentType } from 'react';

import type { DashboardSnapshot, RoleTier } from '@/modules/dashboard/models';

export type { DashboardSnapshot };

export type View =
  | 'dashboard'
  | 'configuration'
  | 'publishers'
  | 'editorial'
  | 'taxonomy'
  | 'articles'
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

export interface NavBadge {
  readonly label: string | number;
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
    eyebrow: 'Ringkasan Sistem',
    description: 'Angka penting jaringan berita Anda: situs, artikel, pengiriman, dan pembaca.',
  },
  editorial: {
    title: 'Manajemen Artikel & Konten',
    eyebrow: 'Ruang Kerja Redaksi',
    description: 'Tulis dan kelola berita sebelum dikirim ke situs.',
  },
  taxonomy: {
    title: 'Kelola Kategori & Tag',
    eyebrow: 'Taksonomi Redaksi',
    description: 'Atur kanal kategori dan rapikan tag topik di semua artikel.',
  },
  articles: {
    title: 'Arsip Berita Lintas Portal',
    eyebrow: 'Semua Portal',
    description: 'Jelajahi seluruh artikel jaringan dengan cari, saring, dan halaman.',
  },
  publishing: {
    title: 'Antrean Penerbitan',
    eyebrow: 'Antrean Pengiriman',
    description: 'Daftar pengiriman artikel ke situs beserta statusnya.',
  },
  media: {
    title: 'Galeri Media',
    eyebrow: 'Aset Media',
    description: 'Kumpulan foto dan gambar untuk berita.',
  },
  configuration: {
    title: 'Domain & Wilayah',
    eyebrow: 'Pengaturan Domain',
    description: 'Atur domain, subdomain wilayah, dan akses pengguna.',
  },
  publishers: {
    title: 'Daftar Lembaga Penerbit',
    eyebrow: 'Jaringan Penerbit',
    description: 'Kelola lembaga penerbit dan status verifikasinya.',
  },
  analytics: {
    title: 'Statistik & Grafik',
    eyebrow: 'Statistik Jaringan',
    description: 'Grafik pembaca, pengiriman, dan aktivitas per daerah.',
  },
  audit: {
    title: 'Riwayat Keamanan',
    eyebrow: 'Catatan Keamanan',
    description: 'Riwayat siapa mengubah apa; tidak bisa dihapus.',
  },
  operations: {
    title: 'Tugas Latar Belakang',
    eyebrow: 'Tugas Mesin',
    description: 'Pekerjaan mesin di belakang layar: pembersihan dan antrean sistem.',
  },
  settings: {
    title: 'Koneksi & Kunci Akses',
    eyebrow: 'Kunci & Koneksi',
    description: 'Kunci akses dan surel.',
  },
  customers: {
    title: 'Kelola Pelanggan',
    eyebrow: 'Pelanggan & Langganan',
    description: 'Kelola akun pelanggan dan langganannya.',
  },
  content: {
    title: 'Konten Website',
    eyebrow: 'Halaman Publik',
    description: 'Testimoni, tanya-jawab, dan kontak yang tampil di situs publik.',
  },
  billing: {
    title: 'Langganan',
    eyebrow: 'Tagihan',
    description: 'Status aktivasi organisasi.',
  },
  moderation: {
    title: 'Laporan & Data Pengguna',
    eyebrow: 'Keamanan Konten',
    description: 'Laporan konten bermasalah dan permintaan data pengguna.',
  },
};