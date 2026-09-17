import Image from 'next/image';
import Link from 'next/link';

import { AuthAlert } from '@/modules/auth/components/auth-ui';
import { EditionDate } from '@/modules/auth/components/edition-date';
import { SignInMethods } from '@/modules/auth/components/sign-in-methods';
import { SERVICE_NAME } from '@/ui/site/marketing-content';
import { currentYear } from '@/modules/site/current-year';

export default async function SignInPage({
  searchParams,
}: {
  readonly searchParams?: Promise<{ readonly auth?: string | string[] }>;
}) {
  const params = await searchParams;
  const linkFailed = params?.auth === 'unavailable';
  const year = await currentYear();
  return (
    <div className="flex min-h-screen flex-col bg-[#f4f2ec] font-sans text-[#1a2430] antialiased [color-scheme:light]">
      <header className="border-b border-[#e2ded2]">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-5 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5" aria-label={`${SERVICE_NAME} beranda`}>
            <Image
              src="/brand/indicate-mark.svg"
              alt=""
              aria-hidden="true"
              width={32}
              height={32}
              className="h-8 w-8 flex-none"
            />
            <span className="grid leading-none">
              <strong className="text-[15px] font-semibold tracking-tight">{SERVICE_NAME}</strong>
              <small className="mt-0.5 font-mono text-[9px] tracking-[0.16em] text-[#5f6b7a] uppercase">
                Publishing infrastructure
              </small>
            </span>
          </Link>
          <p className="m-0 flex items-center gap-3 font-mono text-[11px] tracking-wide text-[#5f6b7a]">
            <span>Jakarta</span>
            <span aria-hidden="true" className="h-3 w-px bg-[#e2ded2]" />
            <EditionDate />
            <span aria-hidden="true" className="h-3 w-px bg-[#e2ded2]" />
            <span>Edisi harian</span>
          </p>
        </div>
      </header>

      <main className="grid flex-1 place-items-center px-5 py-14 sm:px-8">
        <div className="w-full max-w-md">
          <p className="m-0 flex items-center gap-2.5 font-mono text-xs font-medium tracking-wide text-[#8a5f1c] uppercase">
            <span aria-hidden="true" className="h-px w-8 flex-none bg-[#b88d3a]" />
            Akses workspace
          </p>
          <h1 className="m-0 mt-3 font-sans text-3xl font-bold tracking-tight">
            Masuk ke dashboard
          </h1>
          <p className="m-0 mt-2 font-sans text-sm leading-relaxed text-[#4c5b6b]">
            Masukkan email kerja — kami kirim kode masuk 6 digit yang kedaluwarsa dalam beberapa
            menit.
          </p>
          {linkFailed ? (
            <div className="mt-6">
              <AuthAlert tone="error">
                Tautan masuk tidak valid atau kedaluwarsa. Minta kode baru di bawah.
              </AuthAlert>
            </div>
          ) : null}
          <div className="mt-8 rounded-lg border border-[#e2ded2] bg-white p-6 shadow-[0_24px_48px_-28px_rgba(26,36,48,0.3)] sm:p-8">
            <SignInMethods />
          </div>
          <p className="m-0 mt-6 text-center font-sans text-sm text-[#4c5b6b]">
            Belum punya akun?{' '}
            <Link href="/sign-up" className="font-medium text-[#8a5f1c] hover:underline">
              Daftar di sini
            </Link>
          </p>
        </div>
      </main>

      <footer>
        <p
          aria-hidden="true"
          className="m-0 overflow-hidden text-center font-sans text-[18vw] leading-[0.85] font-bold tracking-tight text-transparent select-none [-webkit-text-stroke:1px_#d8d3c4] lg:text-[10rem]"
        >
          INDICATE
        </p>
        <div className="border-t border-[#e2ded2]">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-5 py-4 font-mono text-[11px] text-[#5f6b7a] sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <p className="m-0">© {year} {SERVICE_NAME}. Hak cipta dilindungi undang-undang.</p>
            <p className="m-0 tabular-nums">PT Sanca Phena Cakra</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
