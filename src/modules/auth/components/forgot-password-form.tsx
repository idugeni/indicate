'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { AuthAlert, AuthLabel, AuthSubmit } from '@/modules/auth/components/auth-ui';
import { createBrowserSupabaseClient } from '@/integrations/supabase/supabase-browser';

/** Client recovery leaf; parent page stays a Server Component. */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    if (!email) {
      setError('Masukkan alamat email Anda.');
      setBusy(false);
      return;
    }

    try {
      const supabase = createBrowserSupabaseClient();
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${siteUrl}/auth/callback?next=%2Fupdate-password`,
      });
      if (error) {
        setError(error.message);
        setBusy(false);
        return;
      }
      setSent(true);
    } catch {
      setError('Terjadi gangguan jaringan saat mengirim tautan pemulihan.');
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <AuthAlert tone="success">
        <span className="flex items-center gap-2 font-medium">
          <Send className="h-4 w-4" /> Tautan pemulihan terkirim
        </span>
        <p className="mt-1 text-paper-dim">
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
        <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@kabarjateng.org" className="font-sans" />
      </div>

      <AuthSubmit busy={busy} busyLabel="Mengirim..." icon={Send}>
        Kirim Tautan Pemulihan
      </AuthSubmit>
    </form>
  );
}
