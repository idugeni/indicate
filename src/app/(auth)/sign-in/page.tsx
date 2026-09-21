import Image from 'next/image';
import Link from 'next/link';
import { Suspense } from 'react';

import { AuthAlert } from '@/modules/auth/components/auth-ui';
import { SignInMethods } from '@/modules/auth/components/sign-in-methods';
import { SERVICE_NAME } from '@/ui/site/marketing-content';
import { currentYear } from '@/modules/site/current-year';

const PANEL_STEPS: readonly { readonly title: string; readonly detail: string }[] = Object.freeze([
  { title: 'Tulis sekali', detail: 'Satu naskah, satu antrean redaksi.' },
  { title: 'Terbit ke mana-mana', detail: 'Ratusan portal, domain, dan wilayah.' },
  { title: 'Teraudit penuh', detail: 'Setiap aksi tercatat, hanya-tambah.' },
]);

const AUTH_ALERTS: Readonly<Record<string, string>> = Object.freeze({
  unavailable: 'Tautan masuk tidak valid atau kedaluwarsa. Minta kode baru di bawah.',
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
    <div className="mt-6">
      <AuthAlert tone="error">
        {message}
      </AuthAlert>
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
    <div className="min-h-screen supports-[min-height:100svh]:min-h-svh bg-[#f4f2ec] font-sans text-[#1a2430] antialiased [color-scheme:light] lg:grid lg:h-svh lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:overflow-hidden">
      <main className="flex flex-col justify-center px-5 py-10 sm:px-10 lg:h-svh lg:overflow-y-auto lg:py-8">
        <div className="mx-auto w-full max-w-md">
          <Link
            href="/"
            className="font-mono text-[11px] uppercase tracking-wider text-[#5f6b7a] transition-colors hover:text-[#1a2430]"
          >
            ← {SERVICE_NAME}
          </Link>
          <Suspense fallback={null}>
            <SignInAlert searchParams={searchParams} />
          </Suspense>
          <div className="mt-6 rounded-xl border border-[#e2ded2] bg-white p-6 shadow-[0_24px_48px_-28px_rgba(26,36,48,0.3)] sm:p-8">
            <p className="m-0 flex items-center gap-2.5 font-mono text-xs font-medium tracking-wide text-[#8a5f1c] uppercase">
              <span aria-hidden="true" className="h-px w-8 flex-none bg-[#b88d3a]" />
              Akses workspace
            </p>
            <h1 className="m-0 mt-3 font-sans text-2xl font-bold tracking-tight">
              Masuk ke dashboard
            </h1>
            <p className="m-0 mt-2 font-sans text-sm leading-relaxed text-[#4c5b6b]">
              Masukkan email kerja — kami kirim kode masuk 8 digit yang kedaluwarsa dalam
              beberapa menit.
            </p>
            <div className="mt-6">
              <SignInMethods />
            </div>
          </div>
          <p className="m-0 mt-6 text-center font-sans text-sm text-[#4c5b6b]">
            Belum punya akun?{' '}
            <Link href="/sign-up" className="font-medium text-[#8a5f1c] hover:underline">
              Daftar di sini
            </Link>
          </p>
        </div>
      </main>

      <aside className="hidden border-l border-white/15 bg-[#1a2430] p-12 text-white lg:flex lg:h-dvh lg:flex-col lg:justify-between lg:overflow-hidden">
        <Link href="/" className="flex items-center gap-3 no-underline" aria-label="Indicate beranda">
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
            <span className="font-sans text-xl font-semibold tracking-tight text-white">{SERVICE_NAME}</span>
            <span className="mt-1 font-mono text-[10px] tracking-[0.18em] text-white/60 uppercase">
              Publishing infrastructure
            </span>
          </span>
        </Link>

        <div>
          <p className="m-0 max-w-md font-serif text-5xl font-medium leading-[1.05] tracking-tight text-balance text-white">
            Satu sinyal untuk ratusan kanal berita.
          </p>
          <ol className="m-0 mt-10 grid list-none gap-0 p-0">
            {PANEL_STEPS.map((step, index) => (
              <li
                key={step.title}
                className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3 border-t border-white/15 py-4 last:border-b"
              >
                <span className="font-mono text-xs tabular-nums text-[#e8c87e]">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div>
                  <p className="m-0 font-sans text-sm font-semibold text-white">{step.title}</p>
                  <p className="m-0 mt-0.5 font-sans text-xs text-[#c7d2fe]">{step.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <p className="m-0 font-mono text-[11px] text-white/60">
          © {year} {SERVICE_NAME} · PT Sanca Phena Cakra
        </p>
      </aside>
    </div>
  );
}
