import Link from 'next/link';

import { AuthPage } from '@/modules/auth/components/auth-ui';
import { GoogleButton } from '@/modules/auth/components/google-button';
import { SignInForm } from '@/modules/auth/components/sign-in-form';

export default function SignInPage() {
  return (
    <AuthPage
      title="Masuk ke dashboard"
      lede="Sesi Supabase Auth yang valid diperlukan sebelum data organisasi dimuat."
      footer={
        <p className="m-0 text-center">
          Belum punya akun?{' '}
          <Link href="/sign-up" className="text-[#8a5f1c] hover:underline">
            Daftar di sini
          </Link>
        </p>
      }
    >
      <div className="space-y-6">
        <SignInForm />

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-[#e2ded2]" aria-hidden="true" />
          <span className="font-mono text-[11px] text-[#5f6b7a]">ATAU</span>
          <div className="h-px flex-1 bg-[#e2ded2]" aria-hidden="true" />
        </div>

        <GoogleButton />
      </div>
    </AuthPage>
  );
}
