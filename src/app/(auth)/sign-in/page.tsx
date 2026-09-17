import Link from 'next/link';

import { AuthAlert, AuthPage } from '@/modules/auth/components/auth-ui';
import { SignInMethods } from '@/modules/auth/components/sign-in-methods';

export default async function SignInPage({
  searchParams,
}: {
  readonly searchParams?: Promise<{ readonly auth?: string | string[] }>;
}) {
  const params = await searchParams;
  const linkFailed = params?.auth === 'unavailable';
  return (
    <AuthPage
      title="Masuk ke dashboard"
      lede="Masukkan email kerja — kami kirim kode masuk 6 digit yang kedaluwarsa dalam beberapa menit."
      footer={
        <p className="m-0 text-center">
          Belum punya akun?{' '}
          <Link href="/sign-up" className="text-[#8a5f1c] hover:underline">
            Daftar di sini
          </Link>
        </p>
      }
    >
      {linkFailed ? (
        <div className="mb-6">
          <AuthAlert tone="error">
            Tautan masuk tidak valid atau kedaluwarsa. Minta kode baru di bawah.
          </AuthAlert>
        </div>
      ) : null}
      <SignInMethods />
    </AuthPage>
  );
}
