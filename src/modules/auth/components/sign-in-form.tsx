'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowRight } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { AuthAlert, AuthLabel, AuthSubmit } from '@/modules/auth/components/auth-ui';
import { TurnstileField, isTurnstileConfigured } from '@/modules/auth/components/turnstile-field';
import { createBrowserSupabaseClient } from '@/integrations/supabase/supabase-browser';

/** Client sign-in leaf; parent page stays a Server Component. */
export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [challengeNonce, setChallengeNonce] = useState(0);
  const turnstilePending = isTurnstileConfigured() && captchaToken === null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);

    if (!email || !password) {
      setError('Harap isi alamat email dan kata sandi Anda.');
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
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
        ...(captchaToken === null ? {} : { options: { captchaToken } }),
      });
      if (error) {
        setError('Kredensial tidak valid atau akun belum diverifikasi.');
        setCaptchaToken(null);
        setChallengeNonce((value) => value + 1);
        setBusy(false);
        return;
      }
      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('Terjadi gangguan jaringan saat mencoba masuk.');
      setCaptchaToken(null);
      setChallengeNonce((value) => value + 1);
      setBusy(false);
    }
  };

  return (
    <>
      {error ? <AuthAlert tone="error">{error}</AuthAlert> : null}

      <form onSubmit={handleSubmit} className="space-y-5">
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
          <Input id="password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••••••" className="border-[#1a2430]/20 bg-white dark:border-[#1a2430]/20 dark:bg-white" />
          <div className="mt-1.5 flex justify-end">
            <Link href="/forgot-password" className="font-sans text-xs text-[#8a5f1c] hover:underline">
              Lupa kata sandi?
            </Link>
          </div>
        </div>

        <TurnstileField key={challengeNonce} onToken={setCaptchaToken} />

        <AuthSubmit busy={busy} busyLabel="Verifikasi Sesi..." icon={ArrowRight} disabled={turnstilePending}>
          Masuk ke Dashboard
        </AuthSubmit>
      </form>
    </>
  );
}
