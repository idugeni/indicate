'use client';

import { useId, useState, useTransition, type FormEvent } from 'react';
import { KeyRound, Loader2, Plus, Send, UserPlus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { SectionCard } from '@/modules/dashboard/components/shared/section-card';
import { FormNotice } from '@/modules/dashboard/components/shared/form-notice';
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

interface InvitationOption {
  readonly id: string;
  readonly email: string;
  readonly roleName: string;
  readonly status: string;
  readonly expiresAt: string;
}

export function AccessManagementForm({
  data,
  command,
  organizationId,
}: {
  readonly data: unknown;
  readonly command: (action: string, payload: unknown) => Promise<unknown>;
  readonly organizationId: string;
}) {
  const model = data as {
    readonly roles?: readonly RoleOption[];
    readonly memberships?: readonly MemberOption[];
    readonly invitations?: readonly InvitationOption[];
  } | null;

  const roleNameId = useId();
  const roleTierId = useId();
  const memberSelectId = useId();
  const memberUserId = useId();
  const memberRoleId = useId();
  const memberStatusId = useId();

  const [isCreatingRole, startRoleTransition] = useTransition();
  const [isSavingMembership, startMembershipTransition] = useTransition();
  const [isInviting, startInviteTransition] = useTransition();
  const [isRevoking, startRevokeTransition] = useTransition();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRoleId, setInviteRoleId] = useState('');
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteNotice, setInviteNotice] = useState<string | null>(null);
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

  const inviteEmailId = useId();
  const inviteRoleIdInput = useId();

  const handleCreateInvite = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setInviteNotice(null);
    setInviteCode(null);
    startInviteTransition(async () => {
      try {
        const email = inviteEmail.trim().toLowerCase();
        const roleId = inviteRoleId.trim();
        if (email === '' || roleId === '') {
          setInviteNotice('Isi email dan peran target dulu.');
          return;
        }
        const secretBytes = new Uint8Array(24);
        crypto.getRandomValues(secretBytes);
        const secret = btoa(String.fromCharCode(...secretBytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${organizationId}:${email}:${secret}`));
        const tokenHash = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
        const result = await command('invitation.create', { email, roleId, tokenHash });
        if (result === null) {
          setInviteNotice('Undangan gagal dibuat. Periksa peran dan email.');
          return;
        }
        setInviteCode(`${organizationId}:${email}:${secret}`);
        setInviteNotice('Undangan aktif 24 jam, sekali pakai. Salin kode di bawah untuk penerima.');
        setInviteEmail('');
      } catch {
        setInviteNotice('Undangan gagal dibuat. Periksa peran dan email.');
      }
    });
  };

  const handleRevokeInvite = (inviteId: string) => {
    if (!window.confirm('Batalkan undangan ini? Tautan undangan langsung tidak berlaku.')) return;
    startRevokeTransition(async () => {
      await command('invitation.revoke', { id: inviteId });
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

      <SectionCard icon={Send} title="Undang anggota" eyebrow="Undangan sekali pakai">
        <form onSubmit={handleCreateInvite} className="space-y-3.5">
          <div className="space-y-1.5">
            <label htmlFor={inviteEmailId} className="font-mono text-xs text-paper-dim">
              Email calon anggota
            </label>
            <Input
              id={inviteEmailId}
              name="email"
              type="email"
              required
              disabled={isInviting}
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="redaktur@portal.id"
              className="h-8 rounded border-hairline-strong bg-bg px-2.5 font-sans text-xs text-paper transition-colors duration-180 hover:border-hairline focus-visible:ring-brass"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor={inviteRoleIdInput} className="font-mono text-xs text-paper-dim">
              Peran target
            </label>
            <select
              id={inviteRoleIdInput}
              name="roleId"
              required
              disabled={isInviting}
              value={inviteRoleId}
              onChange={(event) => setInviteRoleId(event.target.value)}
              className="h-8 w-full rounded border border-hairline-strong bg-bg px-2 font-mono text-xs text-paper transition-colors duration-180 hover:border-hairline focus:border-brass focus:outline-none"
            >
              <option value="">— pilih peran —</option>
              {model?.roles?.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>

          {inviteNotice ? <FormNotice tone="muted">{inviteNotice}</FormNotice> : null}
          {inviteCode ? (
            <p className="break-all border-l-2 border-brass bg-brass/[0.06] px-3 py-2.5 font-mono text-xs text-paper">{inviteCode}</p>
          ) : null}

          {(model?.invitations?.length ?? 0) > 0 ? (
            <ul className="m-0 list-none space-y-2 p-0" aria-label="Undangan tercatat">
              {model?.invitations?.map((invitation) => (
                <li
                  key={invitation.id}
                  className="flex items-center gap-2 rounded border border-hairline bg-bg px-2.5 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="m-0 truncate font-sans text-xs font-medium text-paper">{invitation.email}</p>
                    <p className="m-0 truncate font-mono text-[10px] uppercase tracking-wider text-paper-faint">
                      {invitation.roleName} · {invitation.status}
                    </p>
                  </div>
                  {invitation.status === 'pending' ? (
                    <button
                      type="button"
                      disabled={isRevoking}
                      onClick={() => handleRevokeInvite(invitation.id)}
                      className="flex-none rounded border border-hairline-strong px-2 py-1 font-sans text-[11px] text-paper-dim transition-colors duration-180 hover:border-error hover:text-error disabled:opacity-50"
                    >
                      Batalkan
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isInviting}
              className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded bg-brass px-3.5 font-sans text-xs font-semibold text-bg transition-colors duration-180 hover:bg-brass-soft disabled:opacity-50"
            >
              {isInviting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>Buat undangan</span>
            </button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}
