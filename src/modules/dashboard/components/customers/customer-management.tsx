'use client';

import { useId, useState, useTransition, type FormEvent } from 'react';
import { Loader2, Plus, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { SectionCard } from '@/modules/dashboard/components/shared/section-card';
import { FormNotice } from '@/modules/dashboard/components/shared/form-notice';
import { slugify } from '@/modules/dashboard/components/shared/form-utils';

export function CustomerManagement({
  command,
}: {
  readonly command: (action: string, payload: unknown) => Promise<unknown>;
}) {
  const nameInputId = useId();
  const slugInputId = useId();
  const [customerSlug, setCustomerSlug] = useState('');
  const [isCreatingCustomer, startCustomerTransition] = useTransition();
  const [assignEmail, setAssignEmail] = useState('');
  const [assignOrgId, setAssignOrgId] = useState('');
  const [isAssigning, startAssignTransition] = useTransition();
  const [assignNotice, setAssignNotice] = useState<string | null>(null);

  const handleNameBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (!customerSlug) {
      setCustomerSlug(slugify(e.target.value));
    }
  };

  const handleCreateCustomer = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    startCustomerTransition(async () => {
      await command('customer.create', {
        name: String(formData.get('name') ?? '').trim(),
        slug: String(formData.get('slug') ?? '').trim(),
        customerMetadata: {},
        subscription: {
          status: String(formData.get('status') ?? 'active'),
        },
      });
      form.reset();
      setCustomerSlug('');
    });
  };

  const handleAssignFirstAdmin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAssignNotice(null);
    startAssignTransition(async () => {
      try {
        await command('membership.assign-first', { organizationId: assignOrgId.trim(), userEmail: assignEmail.trim() });
        setAssignNotice('Admin pertama berhasil ditetapkan.');
        setAssignEmail('');
      } catch {
        setAssignNotice('Penetapan gagal. Pastikan email sudah mendaftar dan Anda memegang izin platform.');
      }
    });
  };

  const [inviteOrgId, setInviteOrgId] = useState('');
  const [inviteRoleId, setInviteRoleId] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, startInviteTransition] = useTransition();
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteNotice, setInviteNotice] = useState<string | null>(null);

  const handleCreateInvite = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setInviteNotice(null);
    setInviteCode(null);
    startInviteTransition(async () => {
      try {
        const secretBytes = new Uint8Array(24);
        crypto.getRandomValues(secretBytes);
        const secret = btoa(String.fromCharCode(...secretBytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        const orgId = inviteOrgId.trim();
        const email = inviteEmail.trim().toLowerCase();
        const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${orgId}:${email}:${secret}`));
        const tokenHash = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
        const response = await fetch('/api/dashboard/billing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'invite.create', payload: { orgId, roleId: inviteRoleId.trim(), email, tokenHash } }),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        setInviteCode(`${orgId}:${email}:${secret}`);
        setInviteNotice('Undangan aktif 24 jam, sekali pakai. Salin kode di bawah untuk penerima.');
      } catch {
        setInviteNotice('Undangan gagal dibuat. Periksa ID org/role dan email.');
      }
    });
  };

  return (
    <div className="grid w-full grid-cols-1 items-start gap-4 lg:grid-cols-3">
      <SectionCard icon={Users} title="Tenant baru" eyebrow="Registrasi akun">

        <form onSubmit={handleCreateCustomer} className="space-y-3.5">
          <div className="space-y-1.5">
            <label htmlFor={nameInputId} className="font-mono text-xs text-paper-dim">
              Nama Organisasi / Lembaga
            </label>
            <Input
              id={nameInputId}
              name="name"
              required
              disabled={isCreatingCustomer}
              onBlur={handleNameBlur}
              placeholder="Pemerintah Kabupaten Wonosobo"
              className="h-8 rounded border-hairline-strong bg-bg px-2.5 font-sans text-xs text-paper transition-colors duration-180 hover:border-hairline focus-visible:ring-brass"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor={slugInputId} className="font-mono text-xs text-paper-dim">
              Slug Tenant (Kanonikal)
            </label>
            <Input
              id={slugInputId}
              name="slug"
              required
              disabled={isCreatingCustomer}
              value={customerSlug}
              onChange={(e) => setCustomerSlug(e.target.value)}
              pattern="[a-z0-9-]+"
              placeholder="pemkab-wonosobo"
              className="h-8 rounded border-hairline-strong bg-bg px-2.5 font-mono text-xs text-paper transition-colors duration-180 hover:border-hairline focus-visible:ring-brass"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor={`${slugInputId}-status`} className="font-mono text-xs text-paper-dim">
              Status Awal (aktivasi manual setelah bayar)
            </label>
            <select
              id={`${slugInputId}-status`}
              name="status"
              disabled={isCreatingCustomer}
              defaultValue="active"
              className="h-8 w-full rounded border border-hairline-strong bg-bg px-2.5 font-sans text-xs text-paper"
            >
              <option value="active">Aktif — langsung berjalan</option>
              <option value="suspended">Ditangguhkan — aktifkan belakangan</option>
            </select>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isCreatingCustomer}
              className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded bg-brass px-3.5 font-sans text-xs font-semibold text-bg transition-colors duration-180 hover:bg-brass-soft disabled:opacity-50"
            >
              {isCreatingCustomer ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>Buat Organisasi Tenant</span>
            </button>
          </div>
        </form>
      </SectionCard>

      <SectionCard icon={Users} title="Admin pertama" eyebrow="Pengguna harus sudah masuk sekali agar terdaftar">

        <form onSubmit={handleAssignFirstAdmin} className="space-y-3.5">
          <div className="space-y-1.5">
            <label htmlFor={`${slugInputId}-org`} className="font-mono text-xs text-paper-dim">
              ID Organisasi
            </label>
            <Input
              id={`${slugInputId}-org`}
              required
              disabled={isAssigning}
              value={assignOrgId}
              onChange={(e) => setAssignOrgId(e.target.value)}
              placeholder="UUID organisasi"
              className="h-8 rounded border-hairline-strong bg-bg px-2.5 font-mono text-xs text-paper transition-colors duration-180 hover:border-hairline focus-visible:ring-brass"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor={`${slugInputId}-email`} className="font-mono text-xs text-paper-dim">
              Surel Pengguna
            </label>
            <Input
              id={`${slugInputId}-email`}
              type="email"
              required
              disabled={isAssigning}
              value={assignEmail}
              onChange={(e) => setAssignEmail(e.target.value)}
              placeholder="admin@organisasi.id"
              className="h-8 rounded border-hairline-strong bg-bg px-2.5 font-sans text-xs text-paper transition-colors duration-180 hover:border-hairline focus-visible:ring-brass"
            />
          </div>

          {assignNotice ? <FormNotice tone="muted">{assignNotice}</FormNotice> : null}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isAssigning}
              className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded bg-brass px-3.5 font-sans text-xs font-semibold text-bg transition-colors duration-180 hover:bg-brass-soft disabled:opacity-50"
            >
              {isAssigning ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>Tetapkan sebagai Admin</span>
            </button>
          </div>
        </form>
      </SectionCard>

      <SectionCard icon={Plus} title="Undangan organisasi" eyebrow="24 jam · sekali pakai">

        <form onSubmit={handleCreateInvite} className="space-y-3.5">
          <div className="space-y-1.5">
            <label htmlFor={`${slugInputId}-invite-org`} className="font-mono text-xs text-paper-dim">
              ID Organisasi
            </label>
            <Input
              id={`${slugInputId}-invite-org`}
              required
              disabled={isInviting}
              value={inviteOrgId}
              onChange={(e) => setInviteOrgId(e.target.value)}
              placeholder="UUID organisasi"
              className="h-8 rounded border-hairline-strong bg-bg px-2.5 font-mono text-xs text-paper transition-colors duration-180 hover:border-hairline focus-visible:ring-brass"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor={`${slugInputId}-invite-role`} className="font-mono text-xs text-paper-dim">
              ID Role Target
            </label>
            <Input
              id={`${slugInputId}-invite-role`}
              required
              disabled={isInviting}
              value={inviteRoleId}
              onChange={(e) => setInviteRoleId(e.target.value)}
              placeholder="UUID role (bukan superadmin)"
              className="h-8 rounded border-hairline-strong bg-bg px-2.5 font-mono text-xs text-paper transition-colors duration-180 hover:border-hairline focus-visible:ring-brass"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor={`${slugInputId}-invite-email`} className="font-mono text-xs text-paper-dim">
              Surel Penerima
            </label>
            <Input
              id={`${slugInputId}-invite-email`}
              type="email"
              required
              disabled={isInviting}
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="anggota@organisasi.id"
              className="h-8 rounded border-hairline-strong bg-bg px-2.5 font-sans text-xs text-paper transition-colors duration-180 hover:border-hairline focus-visible:ring-brass"
            />
          </div>

          {inviteNotice ? <FormNotice tone="muted">{inviteNotice}</FormNotice> : null}
          {inviteCode ? (
            <p className="break-all border-l-2 border-brass bg-brass/[0.06] px-3 py-2.5 font-mono text-xs text-paper">{inviteCode}</p>
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
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>Buat Undangan</span>
            </button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}