'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowRight } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { AuthAlert, AuthLabel, AuthSubmit } from '@/modules/auth/components/auth-ui';
import { TurnstileField, useTurnstileChallenge } from '@/modules/auth/components/turnstile-field';
import { createBrowserSupabaseClient } from '@/integrations/supabase/supabase-browser';

/** Client sign-in leaf; parent page stays a Server Component. */
export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { captchaToken, challengeNonce, turnstilePending, resetChallenge, onChallengeToken } =
    useTurnstileChallenge();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);

    if (!email.trim() || !password) {
      setError('Harap isi alamat email dan kata sandi Anda.');
      setBusy(false);
      return;
    }
    const target = email.trim();
    if (!target.includes('@')) {
      setError('Masukkan alamat email yang valid.');
      setBusy(false);
      return;
    }

    if (turnstilePending) {
      setError('Selesaikan verifikasi keamanan terlebih dahulu.');
      setBusy(false);
      return;
    }

    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: target,
        password,
        ...(captchaToken === null ? {} : { options: { captchaToken } }),
      });
      if (error) {
        setError('Kredensial tidak valid atau akun belum diverifikasi.');
        resetChallenge();
        setBusy(false);
        return;
      }
      router.push('/dashboard');
      router.refresh();
      setBusy(false);
    } catch {
      setError('Terjadi gangguan jaringan saat mencoba masuk.');
      resetChallenge();
      setBusy(false);
    }
  };

  return (
    <>
      {error ? <AuthAlert tone="error">{error}</AuthAlert> : null}

      <form noValidate onSubmit={handleSubmit} className="space-y-5">
        <div>
          <AuthLabel htmlFor="email">
            Alamat email
          </AuthLabel>
          <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@wartanusantara.net" className="border-[#1a2430]/20 bg-white font-sans dark:border-[#1a2430]/20 dark:bg-white" />
        </div>

        <div>
          <AuthLabel htmlFor="password">
            Kata sandi
          </AuthLabel>
          <PasswordInput id="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••••••" className="border-[#1a2430]/20 bg-white dark:border-[#1a2430]/20 dark:bg-white" />
          <div className="mt-1.5 flex justify-end">
            <Link href="/forgot-password" className="font-sans text-xs text-[#8a5f1c] hover:underline">
              Lupa kata sandi?
            </Link>
          </div>
        </div>

        <TurnstileField key={challengeNonce} onToken={onChallengeToken} />

        <AuthSubmit busy={busy} busyLabel="Masuk..." icon={ArrowRight} disabled={turnstilePending}>
          Masuk ke Dashboard
        </AuthSubmit>
      </form>
    </>
  );
}
