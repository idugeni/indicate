'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { KeyRound, Link2, Loader2 } from 'lucide-react';

import { SectionCard } from '@/modules/dashboard/components/shared/section-card';
import { FormNotice } from '@/modules/dashboard/components/shared/form-notice';
import { Input } from '@/components/ui/input';
import { createBrowserSupabaseClient } from '@/integrations/supabase/supabase-browser';

interface LinkedIdentity {
  readonly provider: string;
}

export function LoginMethodsForm() {
  const [identities, setIdentities] = useState<readonly LinkedIdentity[] | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const reload = async () => {
    try {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase.auth.getUserIdentities();
      if (error) throw error;
      setIdentities(Object.freeze((data.identities ?? []).map(({ provider }) => ({ provider }))));
    } catch {
      setIdentities(null);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(() => reload());
  }, []);

  const hasEmail = identities?.some(({ provider }) => provider === 'email') === true;
  const hasGoogle = identities?.some(({ provider }) => provider === 'google') === true;

  const handleSetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);
    if (password.length < 8 || password !== confirm) {
      setNotice('Kata sandi minimal 8 karakter dan harus sama dengan konfirmasi.');
      return;
    }
    setBusy(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPassword('');
      setConfirm('');
      setNotice('Kata sandi tersimpan. Email ini kini bisa masuk dengan kata sandi.');
      await reload();
    } catch {
      setNotice('Gagal menyimpan kata sandi. Coba lagi.');
    } finally {
      setBusy(false);
    }
  };

  const handleLinkGoogle = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const supabase = createBrowserSupabaseClient();
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
      const { error } = await supabase.auth.linkIdentity({
        provider: 'google',
        options: { redirectTo: `${siteUrl}/auth/callback?next=%2Fdashboard` },
      });
      if (error) throw error;
    } catch {
      setNotice('Penautan Google gagal. Pastikan manual linking aktif di pengaturan Auth.');
      setBusy(false);
    }
  };

  return (
    <SectionCard icon={KeyRound} title="Metode Login" eyebrow="Email · Google — satu akun yang sama">

      <p className="m-0 font-sans text-xs text-paper-dim">
        Tertaut: {identities === null ? 'memuat…' : identities.length === 0 ? '—' : identities.map(({ provider }) => provider).join(', ')}
      </p>

      {!hasEmail ? (
        <form onSubmit={handleSetPassword} className="mt-4 space-y-3">
          <p className="m-0 font-sans text-xs text-paper-dim">
            Anda masuk dengan Google. Buat kata sandi agar email ini juga bisa masuk langsung.
          </p>
          <Input
            type="password" required minLength={8} autoComplete="new-password" disabled={busy}
            value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Kata sandi baru"
            className="h-8 font-sans text-xs"
          />
          <Input
            type="password" required minLength={8} autoComplete="new-password" disabled={busy}
            value={confirm} onChange={(event) => setConfirm(event.target.value)} placeholder="Konfirmasi kata sandi"
            className="h-8 font-sans text-xs"
          />
          <button
            type="submit" disabled={busy}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded bg-brass px-3.5 font-sans text-xs font-semibold text-bg hover:bg-brass-soft disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
            <span>Simpan Kata Sandi</span>
          </button>
        </form>
      ) : null}

      {hasEmail && !hasGoogle ? (
        <div className="mt-4">
          <button
            type="button" onClick={() => void handleLinkGoogle()} disabled={busy}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded border border-hairline-strong px-3.5 font-sans text-xs font-medium text-paper-dim hover:text-paper disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Link2 className="h-3.5 w-3.5" aria-hidden="true" />}
            <span>Tautkan Akun Google</span>
          </button>
        </div>
      ) : null}

      {notice ? <FormNotice tone="muted">{notice}</FormNotice> : null}
    </SectionCard>
  );
}
