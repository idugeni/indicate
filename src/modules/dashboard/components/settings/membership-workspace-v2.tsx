'use client';

import { Users, UserPlus, ShieldCheck } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { SectionCard } from '@/modules/dashboard/components/shared/section-card';
import { EmptyState } from '@/modules/dashboard/components/empty-state';
import type { DashboardCommand } from '@/modules/dashboard/command';
import { DASHBOARD_PERMISSIONS } from '@/modules/dashboard/permissions';
import { AccessManagementForm } from '@/modules/dashboard/components/infrastructure/access-management-form';

interface MembershipRow {
  readonly userId: string;
  readonly displayName: string;
  readonly roleId: string;
  readonly status: string;
  readonly regionId?: string | null;
  readonly version: number;
}

interface RoleRow {
  readonly id: string;
  readonly name: string;
}

interface InvitationRow {
  readonly id: string;
  readonly email: string;
  readonly roleName: string;
  readonly status: string;
  readonly expiresAt: string;
}

interface MembershipModel {
  readonly memberships?: readonly MembershipRow[];
  readonly roles?: readonly RoleRow[];
  readonly invitations?: readonly InvitationRow[];
  readonly regions?: readonly { readonly id: string; readonly name: string }[];
}

const STATUS_LABELS: Readonly<Record<string, string>> = {
  active: 'Aktif',
  inactive: 'Nonaktif',
  archived: 'Diarsipkan',
};

function statusTone(status: string): 'success' | 'secondary' | 'outline' {
  if (status === 'active') return 'success';
  if (status === 'inactive') return 'secondary';
  return 'outline';
}

/**
 * Tenant-scoped membership roster with optional controls gated by the caller's
 * existing organization permissions. Data is sourced from the authorized
 * configuration projection, not from a cross-organization user directory.
 */
export function MembershipWorkspaceV2({
  data,
  command,
  organizationId,
  permissions,
}: {
  readonly data: unknown;
  readonly command: DashboardCommand;
  readonly organizationId: string;
  readonly permissions: ReadonlySet<string>;
}) {
  const model = (typeof data === 'object' && data !== null ? data : {}) as MembershipModel;
  const members = model.memberships ?? [];
  const roles = model.roles ?? [];
  const invitations = model.invitations ?? [];
  const roleNames = new Map(roles.map((role) => [role.id, role.name] as const));
  const regionNames = new Map((model.regions ?? []).map((region) => [region.id, region.name] as const));
  const activeCount = members.filter((member) => member.status === 'active').length;
  const pendingCount = invitations.filter((invite) => invite.status === 'pending').length;
  const canManageRoles = permissions.has(DASHBOARD_PERMISSIONS.roleManage);
  const canManageMemberships = permissions.has(DASHBOARD_PERMISSIONS.membershipManage);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 border-b border-hairline pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="m-0 font-mono text-[10px] uppercase tracking-[0.18em] text-brass">
            Organization Access
          </p>
          <h1 className="m-0 mt-1 font-sans text-2xl font-semibold tracking-tight text-paper">
            Membership
          </h1>
          <p className="m-0 mt-1 max-w-2xl text-xs leading-relaxed text-paper-dim">
            Anggota, peran, status keanggotaan, dan undangan untuk organisasi yang sedang aktif.
          </p>
        </div>
        <Badge variant="outline" className="w-fit gap-1.5">
          <ShieldCheck className="h-3 w-3" aria-hidden="true" />
          Tenant-scoped
        </Badge>
      </header>

      <section aria-label="Ringkasan membership" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          ['Anggota', members.length],
          ['Aktif', activeCount],
          ['Undangan menunggu', pendingCount],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-lg border border-hairline bg-bg-raised p-4">
            <p className="m-0 font-mono text-[10px] uppercase tracking-wider text-paper-dim">{label}</p>
            <p className="m-0 mt-2 font-mono text-xl font-semibold tabular-nums text-paper">{value}</p>
          </div>
        ))}
      </section>

      <SectionCard icon={Users} title="Anggota organisasi" eyebrow="Daftar tenant aktif">
        {members.length === 0 ? (
          <EmptyState compact title="Belum ada anggota yang dapat ditampilkan." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-left">
              <thead>
                <tr className="border-b border-hairline">
                  <th scope="col" className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-paper-faint">Anggota</th>
                  <th scope="col" className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-paper-faint">Peran</th>
                  <th scope="col" className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-paper-faint">Wilayah</th>
                  <th scope="col" className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-paper-faint">Status</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.userId} className="border-b border-hairline last:border-0">
                    <td className="px-3 py-3">
                      <p className="m-0 font-sans text-xs font-medium text-paper">{member.displayName}</p>
                      <p className="m-0 mt-1 font-mono text-[10px] text-paper-faint">{member.userId}</p>
                    </td>
                    <td className="px-3 py-3 text-xs text-paper-dim">{roleNames.get(member.roleId) ?? 'Peran tidak tersedia'}</td>
                    <td className="px-3 py-3 text-xs text-paper-dim">
                      {member.regionId ? (regionNames.get(member.regionId) ?? 'Wilayah terbatas') : 'Semua wilayah'}
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant={statusTone(member.status)}>{STATUS_LABELS[member.status] ?? member.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {canManageRoles || canManageMemberships ? (
        <SectionCard icon={UserPlus} title="Administrasi membership" eyebrow="Kontrol sesuai izin">
          <AccessManagementForm
            data={data}
            command={command}
            organizationId={organizationId}
            canManageRoles={canManageRoles}
            canManageMemberships={canManageMemberships}
          />
        </SectionCard>
      ) : (
        <p className="m-0 text-xs text-paper-faint">
          Halaman ini hanya menampilkan data. Minta administrator organisasi memberi izin pengelolaan bila perubahan diperlukan.
        </p>
      )}
    </div>
  );
}
