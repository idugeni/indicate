'use client';

import { useState, type FormEvent } from 'react';
import { KeyRound, Loader2 } from 'lucide-react';

import { SectionCard } from '@/modules/dashboard/components/shared/section-card';
import { FormNotice } from '@/modules/dashboard/components/shared/form-notice';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/ui/password-input';
import { neonAuthClient } from '@/integrations/neon-auth/client';

/** Password management for Neon email/password accounts. Social account linking is intentionally not available. */
export function LoginMethodsForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const handleSetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);
    if (currentPassword.length === 0) {
      setNotice('Masukkan kata sandi saat ini.');
      return;
    }
    if (password.length < 8 || password !== confirm) {
      setNotice('Kata sandi baru minimal 8 karakter dan harus sama dengan konfirmasi.');
      return;
    }
    setBusy(true);
    try {
      const { error } = await neonAuthClient.changePassword({
        currentPassword,
        newPassword: password,
      });
      if (error) throw error;
      setCurrentPassword('');
      setPassword('');
      setConfirm('');
      setNotice('Kata sandi berhasil diperbarui.');
    } catch {
      setNotice('Gagal memperbarui kata sandi. Periksa kata sandi saat ini lalu coba lagi.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionCard icon={KeyRound} title="Kata Sandi" eyebrow="Neon Managed Auth · Email">
      <p className="m-0 font-sans text-xs text-paper-dim">
        Gunakan kata sandi saat ini untuk mengatur kata sandi baru. Login sosial tidak diaktifkan pada aplikasi ini.
      </p>
      <form noValidate onSubmit={handleSetPassword} className="mt-4 space-y-3">
        <PasswordInput
          required autoComplete="current-password" disabled={busy}
          value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)}
          placeholder="Kata sandi saat ini" className="h-8 font-sans text-xs"
        />
        <PasswordInput
          required minLength={8} autoComplete="new-password" disabled={busy}
          value={password} onChange={(event) => setPassword(event.target.value)}
          placeholder="Kata sandi baru" className="h-8 font-sans text-xs"
        />
        <PasswordInput
          required minLength={8} autoComplete="new-password" disabled={busy}
          value={confirm} onChange={(event) => setConfirm(event.target.value)}
          placeholder="Konfirmasi kata sandi baru" className="h-8 font-sans text-xs"
        />
        <Button type="submit" variant="default" disabled={busy}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
          <span>Perbarui Kata Sandi</span>
        </Button>
      </form>
      {notice ? <FormNotice tone="muted">{notice}</FormNotice> : null}
    </SectionCard>
  );
}
