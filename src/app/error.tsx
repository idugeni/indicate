'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { currentRoutePath, reportClientFault } from '@/core/observability/client-report';
import { Button } from '@/components/ui/button';

interface ErrorPageProps {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}

const noopSubscribe = () => () => undefined;

function getSiteNameSnapshot(): string | null {
  if (typeof document === 'undefined') return null;
  return document.body.dataset.publicSiteName ?? null;
}

function getServerSnapshot(): null {
  return null;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  const siteName = useSyncExternalStore(
    noopSubscribe,
    getSiteNameSnapshot,
    getServerSnapshot
  );

  // Client-minted fallback keeps the displayed Ref in sync with the logged record when no digest exists.
  const [clientId] = useState(() => crypto.randomUUID());
  const eventId = error.digest ?? clientId;

  useEffect(() => {
    reportClientFault({ digest: error.digest, eventId: clientId, errorName: error.name, route: currentRoutePath(), boundary: 'app/error' });
  }, [error, clientId]);

  const pageTitle = siteName
    ? `${siteName} belum dapat dimuat`
    : 'Halaman belum dapat dimuat';

  return (
    <main
      role="alert"
      aria-live="assertive"
      className="flex min-h-svh items-center justify-center p-6"
    >
      <div className="mx-auto w-full max-w-lg rounded-lg border border-[#e2ded2] bg-white p-8 text-center">
        <p className="m-0 font-mono text-xs font-medium uppercase tracking-wider text-[#b3261e]">Gangguan sementara</p>
        <h1 className="m-0 mt-3 font-sans text-2xl font-bold tracking-tight text-[#1a2430]">{pageTitle}</h1>
        <p className="m-0 mt-3 font-sans text-sm leading-relaxed text-[#4c5b6b]">
          Terjadi hambatan saat merender halaman. Permintaan telah dihentikan secara aman
          dan rincian teknis internal tidak dipaparkan ke publik.
        </p>

        <p className="m-0 mt-4 flex items-baseline gap-2 font-mono text-xs text-[#5f6b7a]">
          <span>Ref:</span>
          {/* Fallback Ref differs between prerender and hydration by design; suppress this leaf only. */}
          <code className="text-[#4c5b6b]" suppressHydrationWarning>
            {eventId}
          </code>
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button type="button" onClick={reset}>
            Coba lagi
          </Button>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded border border-[#1a2430]/15 bg-white px-4 py-2 font-sans text-sm font-semibold text-[#1a2430] transition-colors duration-180 hover:border-[#1a2430]/30"
          >
            Kembali ke beranda
          </Link>
        </div>
      </div>
    </main>
  );
}