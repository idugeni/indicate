'use client';

import { useState } from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { AuthAlert, AuthLabel, AuthSubmit } from '@/modules/auth/components/auth-ui';
import { GoogleButton } from '@/modules/auth/components/google-button';
import { createBrowserSupabaseClient } from '@/integrations/supabase/supabase-browser';
import { TurnstileField, isTurnstileConfigured } from '@/modules/auth/components/turnstile-field';

/** Client sign-up leaf; parent page stays a Server Component. */
export function SignUpForm() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [challengeNonce, setChallengeNonce] = useState(0);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    if (!displayName.trim() || !email || password.length < 8) {
      setError('Lengkapi nama, email, dan kata sandi minimal 8 karakter.');
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
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName.trim() },
          emailRedirectTo: `${siteUrl}/auth/callback?next=%2Fdashboard`,
          ...(captchaToken === null ? {} : { captchaToken }),
        },
      });
      if (error) {
        setError(error.message);
        setCaptchaToken(null);
        setChallengeNonce((value) => value + 1);
        setBusy(false);
        return;
      }
      setSent(true);
    } catch {
      setError('Terjadi gangguan jaringan saat mendaftarkan akun.');
      setCaptchaToken(null);
      setChallengeNonce((value) => value + 1);
      setBusy(false);
    }
  };

  return (
    <>
      {sent ? (
        <AuthAlert tone="success">
          <span className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="h-4 w-4" /> Email konfirmasi terkirim
          </span>
          <p className="mt-1 text-[#4c5b6b]">
            Buka kotak masuk Anda dan klik tautan konfirmasi untuk mengaktifkan akun.
          </p>
        </AuthAlert>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {error ? <AuthAlert tone="error">{error}</AuthAlert> : null}

          <div>
            <AuthLabel htmlFor="name">
              Nama lengkap
            </AuthLabel>
            <Input id="name" required autoComplete="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Nama Redaksi / Lembaga" className="border-[#1a2430]/20 bg-white font-sans dark:border-[#1a2430]/20 dark:bg-white" />
          </div>

          <div>
            <AuthLabel htmlFor="email">
              Alamat email
            </AuthLabel>
            <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@suarakabar.com" className="border-[#1a2430]/20 bg-white font-sans dark:border-[#1a2430]/20 dark:bg-white" />
          </div>

          <div>
            <AuthLabel htmlFor="password">
              Kata sandi
            </AuthLabel>
            <Input id="password" type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimal 8 karakter" className="border-[#1a2430]/20 bg-white font-sans dark:border-[#1a2430]/20 dark:bg-white" />
            <p className="m-0 mt-1.5 font-sans text-xs text-[#5f6b7a]">Minimal 8 karakter.</p>
          </div>

          <AuthSubmit busy={busy} busyLabel="Mendaftarkan..." icon={ArrowRight}>
            Buat Akun
          </AuthSubmit>
          <TurnstileField key={challengeNonce} onToken={setCaptchaToken} />
        </form>
      )}

      {!sent ? (
        <>
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-[#e2ded2]" aria-hidden="true" />
            <span className="font-mono text-[11px] text-[#5f6b7a]">ATAU</span>
            <div className="h-px flex-1 bg-[#e2ded2]" aria-hidden="true" />
          </div>

          <GoogleButton />
        </>
      ) : null}
    </>
  );
}
