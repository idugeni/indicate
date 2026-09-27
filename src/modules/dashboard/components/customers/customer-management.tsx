'use client';

import { useId, useState, useTransition, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Building2, Loader2, MailPlus, Plus, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DashboardSelect, DashboardSelectItem } from '@/modules/dashboard/components/shared/dashboard-select';
import { SectionCard } from '@/modules/dashboard/components/shared/section-card';
import { FormNotice } from '@/modules/dashboard/components/shared/form-notice';
import { createInviteSecret, formatInviteCode, hashInviteCode } from '@/modules/dashboard/components/shared/invite-code';
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
    const name = String(formData.get('name') ?? '').trim();
    const slug = String(formData.get('slug') ?? '').trim();
    if (name === '') {
      toast.error('Isi nama organisasi dulu.');
      return;
    }
    if (slug === '') {
      toast.error('Isi slug organisasi dulu.');
      return;
    }
    if (!/^[a-z0-9-]+$/.test(slug)) {
      toast.error('Slug organisasi hanya boleh huruf kecil, angka, dan strip.');
      return;
    }

    startCustomerTransition(async () => {
      await command('customer.create', {
        name,
        slug,
        customerMetadata: {},
        subscription: {
          status: String(formData.get('status') ?? 'suspended'),
        },
      });
      form.reset();
      setCustomerSlug('');
    });
  };

  const handleAssignFirstAdmin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAssignNotice(null);
    const orgId = assignOrgId.trim();
    const target = assignEmail.trim();
    if (orgId === '') {
      setAssignNotice('Pilih organisasi dulu.');
      return;
    }
    if (!target.includes('@')) {
      setAssignNotice('Masukkan alamat email yang valid.');
      return;
    }
    startAssignTransition(async () => {
      try {
        await command('membership.assign-first', { organizationId: orgId, userEmail: target });
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
    const orgId = inviteOrgId.trim();
    const roleId = inviteRoleId.trim();
    const email = inviteEmail.trim().toLowerCase();
    if (orgId === '') {
      setInviteNotice('Pilih organisasi dulu.');
      return;
    }
    if (roleId === '') {
      setInviteNotice('Pilih peran dulu.');
      return;
    }
    if (!email.includes('@')) {
      setInviteNotice('Masukkan alamat email yang valid.');
      return;
    }
    startInviteTransition(async () => {
      try {
        const secret = await createInviteSecret();
        const tokenHash = await hashInviteCode(orgId, email, secret);
        const response = await fetch('/api/dashboard/billing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'invite.create', payload: { orgId, roleId, email, tokenHash } }),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        setInviteCode(formatInviteCode(orgId, email, secret));
        setInviteNotice('Undangan aktif 24 jam, sekali pakai. Salin kode di bawah untuk penerima.');
      } catch {
        setInviteNotice('Undangan gagal dibuat. Periksa ID organisasi/peran dan email.');
      }
    });
  };

  return (
    <div className="grid w-full grid-cols-1 items-start gap-4 lg:grid-cols-3">
      <SectionCard icon={Building2} title="Organisasi Baru" eyebrow="Registrasi akun">

        <form noValidate onSubmit={handleCreateCustomer} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor={nameInputId} className="font-mono text-[10px] uppercase tracking-wider text-paper-dim">
              Nama organisasi / lembaga
            </Label>
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
            <Label htmlFor={slugInputId} className="font-mono text-[10px] uppercase tracking-wider text-paper-dim">
              Kode organisasi
            </Label>
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
            <Label htmlFor={`${slugInputId}-status`} className="font-mono text-[10px] uppercase tracking-wider text-paper-dim">
              Status awal
            </Label>
            <p className="m-0 font-sans text-[11px] text-paper-faint">Aktivasi manual setelah pembayaran diterima.</p>
            <DashboardSelect
              id={`${slugInputId}-status`}
              name="status"
              disabled={isCreatingCustomer}
              defaultValue="suspended"
              placeholder="Pilih status awal"
            >
              <DashboardSelectItem value="active">Aktif — langsung berjalan</DashboardSelectItem>
              <DashboardSelectItem value="suspended">Ditangguhkan — aktifkan belakangan</DashboardSelectItem>
            </DashboardSelect>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="default"
              size="sm"
              disabled={isCreatingCustomer}
              className="w-full"
            >
              {isCreatingCustomer ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>Buat Organisasi</span>
            </Button>
          </div>
        </form>
      </SectionCard>

      <SectionCard icon={UserCheck} title="Admin pertama" eyebrow="Penetapan peran">

        <form noValidate onSubmit={handleAssignFirstAdmin} className="space-y-3">
          <p className="m-0 font-sans text-[11px] leading-relaxed text-paper-faint">
            Pengguna harus sudah masuk sekali agar terdaftar.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor={`${slugInputId}-org`} className="font-mono text-[10px] uppercase tracking-wider text-paper-dim">
              ID organisasi
            </Label>
            <Input
              id={`${slugInputId}-org`}
              required
              disabled={isAssigning}
              value={assignOrgId}
              onChange={(e) => setAssignOrgId(e.target.value)}
              placeholder="ID organisasi"
              className="h-8 rounded border-hairline-strong bg-bg px-2.5 font-mono text-xs text-paper transition-colors duration-180 hover:border-hairline focus-visible:ring-brass"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${slugInputId}-email`} className="font-mono text-[10px] uppercase tracking-wider text-paper-dim">
              Surel pengguna
            </Label>
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
            <Button
              type="submit"
              variant="default"
              size="sm"
              disabled={isAssigning}
              className="w-full"
            >
              {isAssigning ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>Tetapkan sebagai Admin</span>
            </Button>
          </div>
        </form>
      </SectionCard>

      <SectionCard icon={MailPlus} title="Undangan organisasi" eyebrow="24 jam · sekali pakai">

        <form noValidate onSubmit={handleCreateInvite} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor={`${slugInputId}-invite-org`} className="font-mono text-[10px] uppercase tracking-wider text-paper-dim">
              ID organisasi
            </Label>
            <Input
              id={`${slugInputId}-invite-org`}
              required
              disabled={isInviting}
              value={inviteOrgId}
              onChange={(e) => setInviteOrgId(e.target.value)}
              placeholder="ID organisasi"
              className="h-8 rounded border-hairline-strong bg-bg px-2.5 font-mono text-xs text-paper transition-colors duration-180 hover:border-hairline focus-visible:ring-brass"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${slugInputId}-invite-role`} className="font-mono text-[10px] uppercase tracking-wider text-paper-dim">
              ID peran target
            </Label>
            <Input
              id={`${slugInputId}-invite-role`}
              required
              disabled={isInviting}
              value={inviteRoleId}
              onChange={(e) => setInviteRoleId(e.target.value)}
              placeholder="ID peran (bukan superadmin)"
              className="h-8 rounded border-hairline-strong bg-bg px-2.5 font-mono text-xs text-paper transition-colors duration-180 hover:border-hairline focus-visible:ring-brass"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${slugInputId}-invite-email`} className="font-mono text-[10px] uppercase tracking-wider text-paper-dim">
              Surel penerima
            </Label>
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
            <Button
              type="submit"
              variant="default"
              size="sm"
              disabled={isInviting}
              className="w-full"
            >
              {isInviting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <MailPlus className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>Buat Undangan</span>
            </Button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}