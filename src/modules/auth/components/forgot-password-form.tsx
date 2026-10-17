'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { AuthAlert, AuthLabel, AuthSubmit } from '@/modules/auth/components/auth-ui';
import { TurnstileChallenge, useTurnstileChallenge } from '@/components/turnstile-challenge';
import { neonAuthClient } from '@/integrations/neon-auth/client';

/** Client recovery leaf; Neon Auth sends the reset link, parent remains a Server Component. */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const ready = email.trim().includes('@');
  const { captchaToken, challengeNonce, turnstilePending, resetChallenge, onChallengeToken } =
    useTurnstileChallenge(undefined, ready);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    if (!email.trim()) {
      setError('Masukkan alamat email Anda.');
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
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
      const { error } = await neonAuthClient.requestPasswordReset(
        { email: target, redirectTo: `${siteUrl}/update-password` },
        captchaToken === null ? undefined : { fetchOptions: { headers: { 'cf-turnstile-response': captchaToken } } },
      );
      if (error) {
        setError('Jika akun dapat dipulihkan, instruksi akan dikirim. Periksa konfigurasi autentikasi atau coba lagi.');
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
          <Send className="h-4 w-4" /> Tautan pemulihan diproses
        </span>
        <p className="mt-1 text-[#4c5b6b]">
          Jika alamat email terdaftar, instruksi pemulihan akan dikirim. Periksa kotak masuk Anda.
        </p>
      </AuthAlert>
    );
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-5">
      {error ? <AuthAlert tone="error">{error}</AuthAlert> : null}
      <div>
        <AuthLabel htmlFor="email">Alamat email</AuthLabel>
        <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@kabarjateng.org" className="border-[#1a2430]/20 bg-white font-sans dark:border-[#1a2430]/20 dark:bg-white" />
      </div>
      <TurnstileChallenge armed={ready} key={challengeNonce} onToken={onChallengeToken} />
      <AuthSubmit busy={busy} busyLabel="Mengirim..." icon={Send} disabled={turnstilePending}>
        Kirim Tautan Pemulihan
      </AuthSubmit>
    </form>
  );
}
