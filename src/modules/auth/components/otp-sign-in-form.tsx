'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, MailCheck } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from '@/components/ui/input-otp';
import { AuthAlert, AuthLabel, AuthSubmit } from '@/modules/auth/components/auth-ui';
import { TurnstileField, useTurnstileChallenge } from '@/modules/auth/components/turnstile-field';
import { createBrowserSupabaseClient } from '@/integrations/supabase/supabase-browser';

const CODE_LENGTH = 8;
const RESEND_COOLDOWN_S = 60;

/** Passwordless sign-in leaf: email code first, verified in-page, magic link as backup. */
export function OtpSignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { captchaToken, challengeNonce, turnstilePending, resetChallenge, onChallengeToken } =
    useTurnstileChallenge();
  const [cooldown, setCooldown] = useState(0);
  const verifyingRef = useRef(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const sendCode = async (target: string, token: string | null) => {
    const supabase = createBrowserSupabaseClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    const { error: sendError } = await supabase.auth.signInWithOtp({
      email: target,
      options: {
        emailRedirectTo: `${siteUrl}/auth/callback?next=%2Fdashboard`,
        ...(token === null ? {} : { captchaToken: token }),
      },
    });
    return sendError;
  };

  const handleRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    const target = email.trim();
    if (!target || !target.includes('@')) {
      setError('Masukkan alamat email yang valid.');
      return;
    }
    if (turnstilePending) {
      setError('Selesaikan verifikasi keamanan terlebih dahulu.');
      return;
    }
    setBusy(true);
    setError(null);
    const sendError = await sendCode(target, captchaToken);
    setBusy(false);
    if (sendError) {
      setError('Gagal mengirim kode. Periksa alamat email lalu coba lagi.');
      resetChallenge();
      return;
    }
    setSentTo(target);
    setCode('');
    setCooldown(RESEND_COOLDOWN_S);
    resetChallenge();
  };

  const handleVerify = async (value: string) => {
    if (sentTo === null || verifyingRef.current) return;
    verifyingRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: sentTo,
        token: value,
        type: 'email',
      });
      if (verifyError) {
        setError('Kode salah atau kedaluwarsa. Periksa kembali 8 digit kode.');
        setCode('');
        return;
      }
      router.push('/dashboard');
      router.refresh();
    } finally {
      verifyingRef.current = false;
      setBusy(false);
    }
  };

  const handleCodeChange = (value: string) => {
    const digits = value.replace(/\D/gu, '').slice(0, CODE_LENGTH);
    setCode(digits);
    if (digits.length === CODE_LENGTH) void handleVerify(digits);
  };

  const handleResend = async () => {
    if (sentTo === null || busy || cooldown > 0) return;
    if (turnstilePending) {
      setError('Selesaikan verifikasi keamanan terlebih dahulu.');
      return;
    }
    setBusy(true);
    setError(null);
    const sendError = await sendCode(sentTo, captchaToken);
    setBusy(false);
    if (sendError) {
      setError('Gagal mengirim ulang kode. Coba lagi sesaat lagi.');
      return;
    }
    setCode('');
    setCooldown(RESEND_COOLDOWN_S);
    resetChallenge();
  };

  if (sentTo === null) {
    return (
      <>
        {error ? <AuthAlert tone="error">{error}</AuthAlert> : null}
        <form onSubmit={(event) => void handleRequest(event)} className="space-y-5">
          <div>
            <AuthLabel htmlFor="otp-email">Alamat email</AuthLabel>
            <Input
              id="otp-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="nama@wartanusantara.net"
              className="border-[#1a2430]/20 bg-white font-sans dark:border-[#1a2430]/20 dark:bg-white"
            />
          </div>
          <TurnstileField key={challengeNonce} onToken={onChallengeToken} />
          <AuthSubmit busy={busy} busyLabel="Mengirim kode..." icon={ArrowRight} disabled={turnstilePending}>
            Kirim kode masuk
          </AuthSubmit>
        </form>
      </>
    );
  }

  return (
    <>
      {error ? <AuthAlert tone="error">{error}</AuthAlert> : null}
      <div className="flex items-start gap-3">
        <MailCheck className="mt-0.5 h-5 w-5 flex-none text-[#8a5f1c]" aria-hidden="true" />
        <p className="m-0 font-sans text-sm leading-relaxed text-[#4c5b6b]">
          Kode 8 digit dikirim ke <strong className="font-semibold text-[#1a2430]">{sentTo}</strong>.
          Klik tautan di email itu juga bisa.
        </p>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (code.length === CODE_LENGTH) void handleVerify(code);
        }}
        className="mt-5 space-y-5"
      >
        <div>
          <AuthLabel htmlFor="otp-code">Kode masuk</AuthLabel>
          <InputOTP
            id="otp-code"
            maxLength={CODE_LENGTH}
            value={code}
            onChange={(value) => handleCodeChange(value)}
            autoComplete="one-time-code"
            containerClassName="justify-center"
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} className="h-12 w-10 border-[#1a2430]/20 text-lg text-[#1a2430] dark:border-[#1a2430]/20 dark:bg-white" />
              <InputOTPSlot index={1} className="h-12 w-10 border-[#1a2430]/20 text-lg text-[#1a2430] dark:border-[#1a2430]/20 dark:bg-white" />
              <InputOTPSlot index={2} className="h-12 w-10 border-[#1a2430]/20 text-lg text-[#1a2430] dark:border-[#1a2430]/20 dark:bg-white" />
              <InputOTPSlot index={3} className="h-12 w-10 border-[#1a2430]/20 text-lg text-[#1a2430] dark:border-[#1a2430]/20 dark:bg-white" />
            </InputOTPGroup>
            <InputOTPSeparator />
            <InputOTPGroup>
              <InputOTPSlot index={4} className="h-12 w-10 border-[#1a2430]/20 text-lg text-[#1a2430] dark:border-[#1a2430]/20 dark:bg-white" />
              <InputOTPSlot index={5} className="h-12 w-10 border-[#1a2430]/20 text-lg text-[#1a2430] dark:border-[#1a2430]/20 dark:bg-white" />
              <InputOTPSlot index={6} className="h-12 w-10 border-[#1a2430]/20 text-lg text-[#1a2430] dark:border-[#1a2430]/20 dark:bg-white" />
              <InputOTPSlot index={7} className="h-12 w-10 border-[#1a2430]/20 text-lg text-[#1a2430] dark:border-[#1a2430]/20 dark:bg-white" />
            </InputOTPGroup>
          </InputOTP>
        </div>
        <TurnstileField key={challengeNonce} onToken={onChallengeToken} />
        <AuthSubmit busy={busy} busyLabel="Memverifikasi..." icon={ArrowRight}>
          Masuk
        </AuthSubmit>
      </form>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => {
            setSentTo(null);
            setCode('');
            setError(null);
          }}
          className="font-sans text-sm text-[#4c5b6b] transition-colors hover:text-[#1a2430]"
        >
          Ganti email
        </button>
        <button
          type="button"
          onClick={() => void handleResend()}
          disabled={busy || cooldown > 0 || turnstilePending}
          className="font-sans text-sm font-medium text-[#8a5f1c] transition-colors hover:underline disabled:text-[#5f6b7a] disabled:hover:no-underline"
        >
          {cooldown > 0 ? `Kirim ulang dalam ${cooldown} dtk` : 'Kirim ulang kode'}
        </button>
      </div>
    </>
  );
}
