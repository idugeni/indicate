'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Check } from 'lucide-react';

import { PasswordInput } from '@/components/ui/password-input';
import { AuthAlert, AuthLabel, AuthSubmit } from '@/modules/auth/components/auth-ui';
import { neonAuthClient } from '@/integrations/neon-auth/client';

/** Password-update leaf; Neon Auth token in the reset URL proves access to the mailbox. */
export function UpdatePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    if (password.length < 8) {
      setError('Kata sandi minimal 8 karakter.');
      setBusy(false);
      return;
    }
    if (password !== confirmation) {
      setError('Konfirmasi kata sandi tidak cocok.');
      setBusy(false);
      return;
    }

    const token = new URLSearchParams(window.location.search).get('token')?.trim();
    if (!token) {
      setError('Tautan pemulihan tidak valid atau telah kedaluwarsa. Minta tautan baru.');
      setBusy(false);
      return;
    }

    try {
      const { error } = await neonAuthClient.resetPassword({ newPassword: password, token });
      if (error) {
        setError('Tautan pemulihan tidak valid atau telah kedaluwarsa. Minta tautan baru.');
        setBusy(false);
        return;
      }
      setDone(true);
      setTimeout(() => router.push('/sign-in?auth=password-updated'), 1200);
    } catch {
      setError('Terjadi gangguan jaringan saat memperbarui kata sandi.');
      setBusy(false);
    }
  };

  if (done) {
    return (
      <AuthAlert tone="success">
        <span className="flex items-center gap-2 font-medium"><Check className="h-4 w-4" /> Kata sandi diperbarui</span>
        <p className="mt-1 text-[#4c5b6b]">Mengalihkan ke halaman masuk...</p>
      </AuthAlert>
    );
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-5">
      {error ? <AuthAlert tone="error">{error}</AuthAlert> : null}
      <div>
        <AuthLabel htmlFor="password">Kata sandi baru</AuthLabel>
        <PasswordInput id="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimal 8 karakter" className="border-[#1a2430]/20 bg-white font-sans dark:border-[#1a2430]/20 dark:bg-white" />
      </div>
      <div>
        <AuthLabel htmlFor="confirmation">Konfirmasi kata sandi</AuthLabel>
        <PasswordInput id="confirmation" required minLength={8} autoComplete="new-password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} placeholder="Ulangi kata sandi" className="border-[#1a2430]/20 bg-white font-sans dark:border-[#1a2430]/20 dark:bg-white" />
      </div>
      <AuthSubmit busy={busy} busyLabel="Menyimpan...">Simpan Kata Sandi</AuthSubmit>
    </form>
  );
}
