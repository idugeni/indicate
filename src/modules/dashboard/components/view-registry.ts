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
  LayoutTemplate,
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
    label: 'Command Center', title: 'Command Center', eyebrow: 'Operational Intelligence', group: 'overview',
    description: 'Kesehatan jaringan, workload distribusi, exception, dan aktivitas terbaru.',
    icon: LayoutDashboard, suppressesRawCollections: false,
  },
  analytics: {
    label: 'Intelligence', title: 'Network Intelligence', eyebrow: 'Decision Support', group: 'overview',
    description: 'Analisis pembaca, distribusi, situs, penerbit, dan tren jaringan.',
    icon: BarChart3, suppressesRawCollections: false,
  },
  editorial: {
    label: 'Compose', title: 'Editorial Workspace', eyebrow: 'Content Operations', group: 'editorial',
    description: 'Susun, review, dan siapkan artikel untuk distribusi jaringan.',
    icon: FileText, suppressesRawCollections: true,
  },
  articles: {
    label: 'Content Library', title: 'Content Library', eyebrow: 'Editorial Inventory', group: 'editorial',
    description: 'Cari, filter, edit, dan arsipkan seluruh artikel jaringan.',
    icon: Newspaper, suppressesRawCollections: true,
  },
  taxonomy: {
    label: 'Taxonomy', title: 'Taxonomy Studio', eyebrow: 'Editorial Structure', group: 'editorial',
    description: 'Bangun struktur kategori dan tag yang konsisten di seluruh jaringan.',
    icon: Tags, suppressesRawCollections: true,
  },
  publishers: {
    label: 'Publishers', title: 'Publisher Network', eyebrow: 'Source Network', group: 'editorial',
    description: 'Kelola lembaga penerbit, afiliasi, dan status verifikasi.',
    icon: Users, suppressesRawCollections: false,
  },
  media: {
    label: 'Media Library', title: 'Media Library', eyebrow: 'Asset Operations', group: 'editorial',
    description: 'Kelola aset visual yang dipakai oleh workflow editorial.',
    icon: FolderKanban, suppressesRawCollections: true,
  },
  publishing: {
    label: 'Delivery', title: 'Distribution Control', eyebrow: 'Syndication Operations', group: 'publishing',
    description: 'Pantau queue, delivery, retry, dan hasil distribusi artikel.',
    icon: Share2, suppressesRawCollections: true,
  },
  published: {
    label: 'Live Results', title: 'Live Results', eyebrow: 'Published Network', group: 'publishing',
    description: 'Lacak URL hasil distribusi yang sudah tayang dan siap dibagikan.',
    icon: Link2, suppressesRawCollections: true,
  },
  ads: {
    label: 'Monetization', title: 'Monetization Control', eyebrow: 'Revenue Operations', group: 'publishing',
    description: 'Kelola inventory iklan dan konfigurasi monetisasi jaringan.',
    icon: Megaphone, requiredPermission: DASHBOARD_PERMISSIONS.siteManage, suppressesRawCollections: true,
  },
  configuration: {
    label: 'Network', title: 'Network Infrastructure', eyebrow: 'Tenant Infrastructure', group: 'system',
    description: 'Kelola domain, wilayah, site, branding, dan infrastruktur tenant.',
    icon: Globe, suppressesRawCollections: true,
  },
  settings: {
    label: 'Access', title: 'Access & Integrations', eyebrow: 'Identity & Integrations', group: 'system',
    description: 'Kelola API keys, access keys, koneksi, dan profil akses.',
    icon: KeyRound, requiredPermission: INTEGRATIONS_PERMISSIONS.apiKeyRead, suppressesRawCollections: true,
  },
  billing: {
    label: 'Billing', title: 'Billing & Plan', eyebrow: 'Commercial Control', group: 'system',
    description: 'Status paket, aktivasi, dan kontrol langganan organisasi.',
    icon: CreditCard, requiredPermission: INTEGRATIONS_PERMISSIONS.subscriptionRead, suppressesRawCollections: true,
  },
  audit: {
    label: 'Audit', title: 'Audit & Security', eyebrow: 'Governance', group: 'system',
    description: 'Jejak perubahan, aktor, dan event keamanan yang tidak dapat dihapus.',
    icon: ShieldAlert, requiredPermission: DASHBOARD_PERMISSIONS.auditRead, suppressesRawCollections: false,
  },
  operations: {
    label: 'Operations', title: 'System Operations', eyebrow: 'Runtime Workloads', group: 'system',
    description: 'Pantau pekerjaan background, cleanup, retry, dan workload sistem.',
    icon: RefreshCw, requiredPermission: DASHBOARD_PERMISSIONS.auditRead, suppressesRawCollections: false,
  },
  moderation: {
    label: 'Moderation', title: 'Trust & Moderation', eyebrow: 'Safety Operations', group: 'system',
    description: 'Tangani laporan konten dan permintaan data pengguna.',
    icon: Flag, requiredPermission: DASHBOARD_PERMISSIONS.auditRead, suppressesRawCollections: true,
  },
  customers: {
    label: 'Customers', title: 'Customer Operations', eyebrow: 'Platform Control', group: 'system',
    description: 'Kelola akun pelanggan, organisasi, dan status langganan.',
    icon: Building2, requiredPermission: INTEGRATIONS_PERMISSIONS.superAdmin, suppressesRawCollections: false,
  },
  content: {
    label: 'Web Content', title: 'Public Web Content', eyebrow: 'Brand Surface', group: 'system',
    description: 'Kelola konten publik seperti FAQ, testimoni, dan kontak.',
    icon: LayoutTemplate, requiredPermission: INTEGRATIONS_PERMISSIONS.contentManage, suppressesRawCollections: true,
  },
  ai: {
    label: 'AI Control', title: 'AI Control Center', eyebrow: 'Intelligence Layer', group: 'system',
    description: 'Kelola kredensial, routing, dan konfigurasi asisten AI.,
    icon: Bot, requiredPermission: INTEGRATIONS_PERMISSIONS.aiManage, suppressesRawCollections: true,
  },
};

export const ALL_VIEWS = Object.keys(VIEW_REGISTRY) as readonly View[];

export const VIEWS_WITHOUT_RAW_COLLECTIONS: ReadonlySet<View> = new Set<View>(
  ALL_VIEWS.filter((view) => VIEW_REGISTRY[view].suppressesRawCollections),
);

const GROUP_TITLES: Readonly<Record<ViewGroup, string>> = {
  overview: 'Command Center',
  editorial: 'Content Operations',
  publishing: 'Distribution',
  system: 'Platform Control',
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
