'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowRight } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { AuthAlert, AuthLabel, AuthSubmit } from '@/modules/auth/components/auth-ui';
import { createBrowserSupabaseClient } from '@/integrations/supabase/supabase-browser';

/** Client sign-in leaf; parent page stays a Server Component. */
export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);

    if (!email || !password) {
      setError('Harap isi alamat email dan kata sandi Anda.');
      setBusy(false);
      return;
    }

    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError('Kredensial tidak valid atau akun belum diverifikasi.');
        setBusy(false);
        return;
      }
      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('Terjadi gangguan jaringan saat mencoba masuk.');
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
          <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@wartanusantara.net" className="font-sans" />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <AuthLabel htmlFor="password">
              Kata sandi
            </AuthLabel>
            <Link href="/forgot-password" className="font-sans text-xs text-brass hover:underline">
              Lupa kata sandi?
            </Link>
          </div>
          <Input id="password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••••••" />
        </div>

        <AuthSubmit busy={busy} busyLabel="Verifikasi Sesi..." icon={ArrowRight}>
          Masuk ke Dashboard
        </AuthSubmit>
      </form>
    </>
  );
}
