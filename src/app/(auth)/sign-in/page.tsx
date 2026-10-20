import Image from 'next/image';
import Link from 'next/link';
import { Suspense } from 'react';

import { AuthAlert } from '@/modules/auth/components/auth-ui';
import { SignInMethods } from '@/modules/auth/components/sign-in-methods';
import { SERVICE_NAME } from '@/ui/site/marketing-content';
import { currentYear } from '@/modules/site/current-year';

const AUTH_ALERTS: Readonly<Record<string, string>> = Object.freeze({
  unavailable: 'Sesi masuk tidak valid atau kedaluwarsa. Silakan masuk kembali.',
  provider: 'Masuk dengan Google sedang gagal dikonfigurasi. Hubungi administrator, atau gunakan email dan kata sandi.',
  required: 'Sesi Anda berakhir atau belum masuk. Masuk kembali untuk membuka dashboard.',
  inactive: 'Akun Anda belum aktif. Hubungi administrator organisasi Anda.',
});

async function SignInAlert({
  searchParams,
}: {
  readonly searchParams?: Promise<{ readonly auth?: string | string[] }> | undefined;
}) {
  const params = await searchParams;
  const code = Array.isArray(params?.auth) ? params.auth[0] : params?.auth;
  const message = code === undefined ? undefined : AUTH_ALERTS[code];
  if (message === undefined) return null;
  return (
    <div className="mt-5">
      <AuthAlert tone="error">{message}</AuthAlert>
    </div>
  );
}

export default async function SignInPage({
  searchParams,
}: {
  readonly searchParams?: Promise<{ readonly auth?: string | string[] }>;
}) {
  const year = await currentYear();
  return (
    <main className="flex min-h-screen supports-[min-height:100svh]:min-h-svh items-center justify-center bg-[#f4f2ec] px-4 py-6 font-sans text-[#1a2430] antialiased [color-scheme:light] sm:px-6 sm:py-8">
      <section className="w-full max-w-md rounded-2xl border border-[#e2ded2] bg-white p-6 shadow-[0_24px_64px_-32px_rgba(26,36,48,0.35)] sm:p-8">
        <Link href="/" className="mb-6 flex items-center gap-3 no-underline" aria-label={`${SERVICE_NAME} beranda`}>
          <span className="flex h-9 w-9 items-center justify-center rounded bg-[#f4f2ec]">
            <Image
              unoptimized
              src="/brand/indicate-mark.svg"
              alt=""
              aria-hidden="true"
              width={28}
              height={28}
              className="h-7 w-7 object-contain"
            />
          </span>
          <span className="grid leading-none">
            <span className="font-sans text-lg font-semibold tracking-tight text-[#1a2430]">{SERVICE_NAME}</span>
            <span className="mt-1 font-mono text-[10px] tracking-[0.18em] text-[#5f6b7a] uppercase">
              Publishing infrastructure
            </span>
          </span>
        </Link>
        <Suspense fallback={null}>
          <SignInAlert searchParams={searchParams} />
        </Suspense>
        <p className="m-0 mt-5 flex items-center gap-2.5 font-mono text-xs font-medium tracking-wide text-[#8a5f1c] uppercase">
          <span aria-hidden="true" className="h-px w-8 flex-none bg-[#b88d3a]" />
          Akses workspace
        </p>
        <h1 className="m-0 mt-3 font-sans text-2xl font-bold tracking-tight">
          Masuk ke dashboard
        </h1>
        <p className="m-0 mt-2 font-sans text-sm leading-relaxed text-[#4c5b6b]">
          Masuk menggunakan email dan kata sandi, atau lanjutkan dengan Google.
        </p>
        <div className="mt-6">
          <SignInMethods />
        </div>
        <p className="m-0 mt-6 border-t border-[#e2ded2] pt-5 text-center font-sans text-sm text-[#4c5b6b]">
          Belum punya akun?{' '}
          <Link href="/sign-up" className="font-medium text-[#8a5f1c] hover:underline">
            Daftar di sini
          </Link>
        </p>
        <p className="m-0 mt-5 text-center font-mono text-[10px] text-[#8993a0]">
          © {year} {SERVICE_NAME} · PT Sanca Phena Cakra
        </p>
      </section>
    </main>
  );
}
