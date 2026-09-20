'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { AuthAlert, AuthLabel, AuthSubmit } from '@/modules/auth/components/auth-ui';
import { TurnstileField, useTurnstileChallenge } from '@/modules/auth/components/turnstile-field';
import { createBrowserSupabaseClient } from '@/integrations/supabase/supabase-browser';

/** Client recovery leaf; parent page stays a Server Component. */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const { captchaToken, challengeNonce, turnstilePending, resetChallenge, onChallengeToken } =
    useTurnstileChallenge();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    if (!email) {
      setError('Masukkan alamat email Anda.');
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
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${siteUrl}/auth/callback?next=%2Fupdate-password`,
        ...(captchaToken === null ? {} : { captchaToken }),
      });
      if (error) {
        setError(error.message);
        resetChallenge();
        setBusy(false);
        return;
      }
      setSent(true);
    } catch {
      setError('Terjadi gangguan jaringan saat mengirim tautan pemulihan.');
      resetChallenge();
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <AuthAlert tone="success">
        <span className="flex items-center gap-2 font-medium">
          <Send className="h-4 w-4" /> Tautan pemulihan terkirim
        </span>
        <p className="mt-1 text-[#4c5b6b]">
          Periksa kotak masuk Anda dan ikuti tautan untuk membuat kata sandi baru.
        </p>
      </AuthAlert>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error ? <AuthAlert tone="error">{error}</AuthAlert> : null}

      <div>
        <AuthLabel htmlFor="email">
          Alamat email
        </AuthLabel>
        <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@kabarjateng.org" className="border-[#1a2430]/20 bg-white font-sans dark:border-[#1a2430]/20 dark:bg-white" />
      </div>

      <TurnstileField key={challengeNonce} onToken={onChallengeToken} />
      <AuthSubmit busy={busy} busyLabel="Mengirim..." icon={Send} disabled={turnstilePending}>
        Kirim Tautan Pemulihan
      </AuthSubmit>
    </form>
  );
}
