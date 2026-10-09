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
  /** Alternative grants accepted by the underlying capability. */
  readonly requiredAnyPermission?: readonly string[];
  /** Group heading in the sidebar and category badge in the command palette. */
  readonly group: ViewGroup;
}

export type ViewGroup = 'overview' | 'editorial' | 'publishing' | 'system';

export const VIEW_REGISTRY: Readonly<Record<View, ViewMetadata>> = {
  dashboard: {
    label: 'Command Center', title: 'Command Center', eyebrow: 'Operational Intelligence', group: 'overview',
    description: 'Kesehatan jaringan, workload distribusi, exception, dan aktivitas terbaru.',
    icon: LayoutDashboard,
  },
  analytics: {
    label: 'Intelligence', title: 'Network Intelligence', eyebrow: 'Decision Support', group: 'overview',
    description: 'Analisis pembaca, distribusi, situs, penerbit, dan tren jaringan.',
    icon: BarChart3,
  },
  editorial: {
    label: 'Compose', title: 'Editorial Workspace', eyebrow: 'Content Operations', group: 'editorial',
    description: 'Susun, review, dan siapkan artikel untuk distribusi jaringan.',
    icon: FileText,
  },
  articles: {
    label: 'Content Library', title: 'Content Library', eyebrow: 'Editorial Inventory', group: 'editorial',
    description: 'Cari, filter, edit, dan arsipkan seluruh artikel jaringan.',
    icon: Newspaper,
  },
  taxonomy: {
    label: 'Taxonomy', title: 'Taxonomy Studio', eyebrow: 'Editorial Intelligence', group: 'editorial',
    description: 'Pantau konsistensi kategori, cakupan artikel, dan kosakata tag di seluruh jaringan.',
    icon: Tags,
  },
  publishers: {
    label: 'Publishers', title: 'Publisher Network', eyebrow: 'Source Network', group: 'editorial',
    description: 'Kelola lembaga penerbit, afiliasi, dan status verifikasi.',
    icon: Users,
  },
  media: {
    label: 'Media Library', title: 'Media Library', eyebrow: 'Asset Operations', group: 'editorial',
    description: 'Kelola aset visual yang dipakai oleh workflow editorial.',
    icon: FolderKanban,
  },
  publishing: {
    label: 'Delivery', title: 'Distribution Control', eyebrow: 'Syndication Operations', group: 'publishing',
    description: 'Pantau queue, delivery, retry, dan hasil distribusi artikel.',
    icon: Share2,
  },
  published: {
    label: 'Live Results', title: 'Live Results', eyebrow: 'Published Network', group: 'publishing',
    description: 'Lacak URL hasil distribusi yang sudah tayang dan siap dibagikan.',
    icon: Link2,
  },
  ads: {
    label: 'Monetization', title: 'Ads Control Center', eyebrow: 'Revenue Operations', group: 'publishing',
    description: 'Pantau kesiapan slot iklan, cakupan kreatif, campaign, dan penempatan jaringan.',
    icon: Megaphone, requiredPermission: DASHBOARD_PERMISSIONS.siteManage,
  },
  configuration: {
    label: 'Network', title: 'Network Infrastructure', eyebrow: 'Tenant Infrastructure', group: 'system',
    description: 'Kelola domain, wilayah, site, branding, dan infrastruktur tenant.',
    icon: Globe,
  },
  settings: {
    label: 'Access', title: 'Access & Integrations', eyebrow: 'Identity & Integrations', group: 'system',
    description: 'Kelola API keys, access keys, koneksi, dan profil akses.',
    icon: KeyRound, requiredPermission: INTEGRATIONS_PERMISSIONS.apiKeyRead,
  },
  billing: {
    label: 'Billing', title: 'Billing & Plan', eyebrow: 'Commercial Control', group: 'system',
    description: 'Status paket, aktivasi, dan kontrol langganan organisasi.',
    icon: CreditCard, requiredPermission: INTEGRATIONS_PERMISSIONS.subscriptionRead,
  },
  audit: {
    label: 'Audit', title: 'Audit & Security', eyebrow: 'Governance', group: 'system',
    description: 'Jejak perubahan, aktor, dan event keamanan yang tidak dapat dihapus.',
    icon: ShieldAlert, requiredPermission: DASHBOARD_PERMISSIONS.auditRead,
  },
  operations: {
    label: 'Operations', title: 'System Operations', eyebrow: 'Runtime Workloads', group: 'system',
    description: 'Pantau pekerjaan background, cleanup, retry, dan workload sistem.',
    icon: RefreshCw, requiredPermission: DASHBOARD_PERMISSIONS.auditRead,
  },
  moderation: {
    label: 'Moderation', title: 'Trust & Moderation', eyebrow: 'Safety Operations', group: 'system',
    description: 'Tangani laporan konten dan permintaan data pengguna.',
    icon: Flag, requiredPermission: DASHBOARD_PERMISSIONS.auditRead,
  },
  customers: {
    label: 'Customers', title: 'Customer Operations', eyebrow: 'Platform Control', group: 'system',
    description: 'Kelola akun pelanggan, organisasi, dan status langganan.',
    icon: Building2, requiredAnyPermission: [INTEGRATIONS_PERMISSIONS.superAdmin, INTEGRATIONS_PERMISSIONS.customerAdmin],
  },
  content: {
    label: 'Web Content', title: 'Public Web Content', eyebrow: 'Brand Surface', group: 'system',
    description: 'Kelola konten publik seperti FAQ, testimoni, dan kontak.',
    icon: LayoutTemplate, requiredPermission: INTEGRATIONS_PERMISSIONS.contentManage,
  },
  ai: {
    label: 'AI Control', title: 'AI Control Center', eyebrow: 'Intelligence Layer', group: 'system',
    description: 'Kelola kredensial, routing, dan konfigurasi asisten AI.',
    icon: Bot, requiredPermission: INTEGRATIONS_PERMISSIONS.aiManage,
  },
};

export const ALL_VIEWS = Object.keys(VIEW_REGISTRY) as readonly View[];


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
export function canAccessView(view: View, permissions: ReadonlySet<string>): boolean {
  const metadata = VIEW_REGISTRY[view];
  if (metadata.requiredAnyPermission !== undefined) {
    return metadata.requiredAnyPermission.some((permission) => permissions.has(permission));
  }
  const required = metadata.requiredPermission;
  return required === undefined || permissions.has(required);
}

export function visibleNavGroups(permissions: ReadonlySet<string>): readonly { readonly id: ViewGroup; readonly title: string; readonly views: readonly View[] }[] {
  const order: readonly ViewGroup[] = ['overview', 'editorial', 'publishing', 'system'];
  return order
    .map((id) => ({
      id,
      title: GROUP_TITLES[id],
      views: ALL_VIEWS.filter((view) => VIEW_REGISTRY[view].group === id && canAccessView(view, permissions)),
    }))
    .filter((group) => group.views.length > 0);
}
