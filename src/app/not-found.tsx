import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import { buttonVariants } from '@/components/ui/button';
import { NotFoundPage } from '@/modules/site/components/network/network-listing';
import { notFoundMetadata } from '@/modules/site/seo';
import { classifyTenantHost } from '@/modules/delivery/network-runtime';
import { deliveryComposition } from '@/modules/delivery';

export const metadata: Metadata = notFoundMetadata();

async function resolveNotFoundSite() {
  try {
    const requestHeaders = await headers();
    const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host');

    if (!host) return null;

    const classification = await classifyTenantHost(host);
    if (classification.kind !== 'site') return null;

    const { content } = await deliveryComposition();
    return content.loadShell(classification.context);
  } catch {
    return null;
  }
}

function GenericNotFound() {
  return (
    <main className="flex min-h-screen supports-[min-height:100svh]:min-h-svh items-center justify-center bg-[#f4f2ec] [padding:max(1.5rem,env(safe-area-inset-top))_max(1.5rem,env(safe-area-inset-right))_max(1.5rem,env(safe-area-inset-bottom))_max(1.5rem,env(safe-area-inset-left))] text-[#1a2430]">
      <div className="mx-auto w-full max-w-md rounded-lg border border-[#e2ded2] bg-white p-8 text-center">
        <p className="m-0 font-mono text-xs font-medium uppercase tracking-wider text-[#8a5f1c]">404 · Not found</p>
        <h1 className="m-0 mt-2 font-sans text-2xl font-bold tracking-tight">Halaman tidak ditemukan</h1>
        <p className="m-0 mt-2 font-sans text-sm leading-relaxed text-[#4c5b6b]">
          Hostname atau alamat yang Anda tuju tidak dikenal atau telah dipindahkan dari jaringan.
        </p>
        <div className="mt-5">
          <Link href="/" className={buttonVariants({ className: 'mt-2' })}>
            Kembali ke beranda
          </Link>
        </div>
      </div>
    </main>
  );
}

/** Varian tenant (butuh host + DB) streaming di belakang fallback generik yang statis. */
async function TenantNotFound() {
  const site = await resolveNotFoundSite();

  if (site === null) return <GenericNotFound />;

  return <NotFoundPage site={site} />;
}

export default function NotFound() {
  return (
    <Suspense fallback={<GenericNotFound />}>
      <TenantNotFound />
    </Suspense>
  );
}
