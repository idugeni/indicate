'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Check } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { AuthAlert, AuthLabel, AuthSubmit } from '@/modules/auth/components/auth-ui';
import { TurnstileField, isTurnstileConfigured } from '@/modules/auth/components/turnstile-field';
import { createBrowserSupabaseClient } from '@/integrations/supabase/supabase-browser';

/** Client password-update leaf; parent page stays a Server Component. */
export function UpdatePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [challengeNonce, setChallengeNonce] = useState(0);
  const turnstilePending = isTurnstileConfigured() && captchaToken === null;

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
    if (isTurnstileConfigured() && captchaToken === null) {
      setError('Selesaikan verifikasi keamanan terlebih dahulu.');
      setBusy(false);
      return;
    }

    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError(error.message);
        setCaptchaToken(null);
        setChallengeNonce((value) => value + 1);
        setBusy(false);
        return;
      }
      setDone(true);
      setTimeout(() => router.push('/dashboard'), 1200);
    } catch {
      setError('Terjadi gangguan jaringan saat memperbarui kata sandi.');
      setCaptchaToken(null);
      setChallengeNonce((value) => value + 1);
      setBusy(false);
    }
  };

  if (done) {
    return (
      <AuthAlert tone="success">
        <span className="flex items-center gap-2 font-medium">
          <Check className="h-4 w-4" /> Kata sandi diperbarui
        </span>
        <p className="mt-1 text-[#4c5b6b]">Mengalihkan ke workspace...</p>
      </AuthAlert>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error ? <AuthAlert tone="error">{error}</AuthAlert> : null}

      <div>
        <AuthLabel htmlFor="password">
          Kata sandi baru
        </AuthLabel>
        <Input id="password" type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimal 8 karakter" className="border-[#1a2430]/20 bg-white font-sans dark:border-[#1a2430]/20 dark:bg-white" />
      </div>

      <div>
        <AuthLabel htmlFor="confirmation">
          Konfirmasi kata sandi
        </AuthLabel>
        <Input id="confirmation" type="password" required minLength={8} autoComplete="new-password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} placeholder="Ulangi kata sandi" className="border-[#1a2430]/20 bg-white font-sans dark:border-[#1a2430]/20 dark:bg-white" />
      </div>

      <TurnstileField key={challengeNonce} onToken={setCaptchaToken} />
      <AuthSubmit busy={busy} busyLabel="Menyimpan..." disabled={turnstilePending}>
        Simpan Kata Sandi
      </AuthSubmit>
    </form>
  );
}
