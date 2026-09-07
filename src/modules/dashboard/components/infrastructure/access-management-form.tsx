'use client';

import { useId, useState, useTransition, type FormEvent } from 'react';
import { KeyRound, Loader2, Plus, UserPlus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { SectionCard } from '@/modules/dashboard/components/shared/section-card';
import { PermissionChecklist } from '@/modules/dashboard/components/shared/permission-checklist';
import { ROLE_PERMISSION_OPTIONS } from '@/modules/dashboard/components/shared/record-editor-config';

interface RoleOption {
  readonly id: string;
  readonly name: string;
}

interface MemberOption {
  readonly userId: string;
  readonly displayName: string;
  readonly roleId: string;
  readonly version: number;
}

export function AccessManagementForm({
  data,
  command,
}: {
  readonly data: unknown;
  readonly command: (action: string, payload: unknown) => Promise<unknown>;
}) {
  const model = data as {
    readonly roles?: readonly RoleOption[];
    readonly memberships?: readonly MemberOption[];
  } | null;

  const roleNameId = useId();
  const roleTierId = useId();
  const memberSelectId = useId();
  const memberUserId = useId();
  const memberRoleId = useId();
  const memberStatusId = useId();

  const [isCreatingRole, startRoleTransition] = useTransition();
  const [isSavingMembership, startMembershipTransition] = useTransition();
  const [rolePermissions, setRolePermissions] = useState<readonly string[]>([]);

  const handleCreateRole = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    startRoleTransition(async () => {
      const result = await command('role.create', {
        name: String(formData.get('name') ?? '').trim(),
        tier: formData.get('tier'),
        active: formData.get('active') === 'on',
        permissions: [...rolePermissions],
      });
      if (result !== null) {
        form.reset();
        setRolePermissions([]);
      }
    });
  };

  const handleSaveMembership = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const typedUserId = String(formData.get('newUserId') ?? '').trim();
    const selectedUserId = String(formData.get('userId') ?? '').trim();
    const userId = typedUserId !== '' ? typedUserId : selectedUserId;
    if (userId === '') return;
    const existing = model?.memberships?.find((member) => member.userId === userId);

    startMembershipTransition(async () => {
      const result = await command('membership.update', {
        userId,
        roleId: formData.get('roleId'),
        status: formData.get('status'),
        ...(existing === undefined ? {} : { expectedVersion: existing.version }),
      });
      if (result !== null) form.reset();
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <SectionCard icon={KeyRound} title="Peran baru" eyebrow="Hak akses">
        <form onSubmit={handleCreateRole} className="space-y-3.5">
          <div className="space-y-1.5">
            <label htmlFor={roleNameId} className="font-mono text-xs text-paper-dim">
              Nama peran
            </label>
            <Input
              id={roleNameId}
              name="name"
              required
              disabled={isCreatingRole}
              placeholder="Redaktur wilayah"
              className="h-8 rounded border-hairline-strong bg-bg px-2.5 font-sans text-xs text-paper transition-colors duration-180 hover:border-hairline focus-visible:ring-brass"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor={roleTierId} className="font-mono text-xs text-paper-dim">
                Tingkat
              </label>
              <select
                id={roleTierId}
                name="tier"
                disabled={isCreatingRole}
                defaultValue="user"
                className="h-8 w-full rounded border border-hairline-strong bg-bg px-2 font-mono text-xs text-paper transition-colors duration-180 hover:border-hairline focus:border-brass focus:outline-none"
              >
                <option value="user">Anggota</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <label htmlFor={`${roleNameId}-active`} className="flex cursor-pointer items-end gap-2 pb-2">
              <input id={`${roleNameId}-active`} name="active" type="checkbox" defaultChecked disabled={isCreatingRole} className="h-4 w-4 accent-brass" />
              <span className="font-sans text-xs text-paper-dim">Peran aktif</span>
            </label>
          </div>

          <div className="space-y-1.5">
            <span className="font-mono text-xs text-paper-dim">Hak akses peran</span>
            <PermissionChecklist options={ROLE_PERMISSION_OPTIONS} selected={rolePermissions} disabled={isCreatingRole} onChange={setRolePermissions} />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isCreatingRole}
              className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded bg-brass px-3.5 font-sans text-xs font-semibold text-bg transition-colors duration-180 hover:bg-brass-soft disabled:opacity-50"
            >
              {isCreatingRole ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>Buat peran</span>
            </button>
          </div>
        </form>
      </SectionCard>

      <SectionCard icon={UserPlus} title="Penetapan anggota" eyebrow="Peran & status">
        <form onSubmit={handleSaveMembership} className="space-y-3.5">
          <div className="space-y-1.5">
            <label htmlFor={memberSelectId} className="font-mono text-xs text-paper-dim">
              Anggota terdaftar
            </label>
            <select
              id={memberSelectId}
              name="userId"
              disabled={isSavingMembership}
              className="h-8 w-full rounded border border-hairline-strong bg-bg px-2 font-mono text-xs text-paper transition-colors duration-180 hover:border-hairline focus:border-brass focus:outline-none"
            >
              <option value="">— pilih anggota —</option>
              {model?.memberships?.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.displayName} · {member.userId}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor={memberUserId} className="font-mono text-xs text-paper-dim">
              Atau ID pengguna baru (sudah pernah masuk sekali)
            </label>
            <Input
              id={memberUserId}
              name="newUserId"
              disabled={isSavingMembership}
              placeholder="UUID pengguna"
              className="h-8 rounded border-hairline-strong bg-bg px-2.5 font-mono text-xs text-paper transition-colors duration-180 hover:border-hairline focus-visible:ring-brass"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor={memberRoleId} className="font-mono text-xs text-paper-dim">
                Peran target
              </label>
              <select
                id={memberRoleId}
                name="roleId"
                required
                disabled={isSavingMembership}
                className="h-8 w-full rounded border border-hairline-strong bg-bg px-2 font-mono text-xs text-paper transition-colors duration-180 hover:border-hairline focus:border-brass focus:outline-none"
              >
                {model?.roles?.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor={memberStatusId} className="font-mono text-xs text-paper-dim">
                Status
              </label>
              <select
                id={memberStatusId}
                name="status"
                disabled={isSavingMembership}
                defaultValue="active"
                className="h-8 w-full rounded border border-hairline-strong bg-bg px-2 font-mono text-xs text-paper transition-colors duration-180 hover:border-hairline focus:border-brass focus:outline-none"
              >
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
                <option value="archived">Diarsipkan</option>
              </select>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSavingMembership}
              className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded bg-brass px-3.5 font-sans text-xs font-semibold text-bg transition-colors duration-180 hover:bg-brass-soft disabled:opacity-50"
            >
              {isSavingMembership ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>Terapkan penetapan</span>
            </button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}
