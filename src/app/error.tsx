'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { currentRoutePath, reportClientFault } from '@/core/observability/client-report';
import { Button, buttonVariants } from '@/components/ui/button';

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
      className="flex min-h-svh items-center p-6"
    >
      <div className="mx-auto w-full max-w-lg border-t-2 border-error pt-6">
        <p className="m-0 font-mono text-xs font-medium uppercase tracking-wider text-error">Gangguan sementara</p>
        <h1 className="m-0 mt-3 font-sans text-2xl font-bold tracking-tight text-paper">{pageTitle}</h1>
        <p className="m-0 mt-3 font-sans text-sm leading-relaxed text-paper-dim">
          Terjadi hambatan saat merender halaman. Permintaan telah dihentikan secara aman
          dan rincian teknis internal tidak dipaparkan ke publik.
        </p>

        <p className="m-0 mt-4 flex items-baseline gap-2 font-mono text-xs text-paper-faint">
          <span>Ref:</span>
          {/* Fallback Ref differs between prerender and hydration by design; suppress this leaf only. */}
          <code className="text-paper-dim" suppressHydrationWarning>
            {eventId}
          </code>
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button type="button" onClick={reset}>
            Coba lagi
          </Button>
          <Link href="/" className={buttonVariants({ variant: 'outline' })}>
            Kembali ke beranda
          </Link>
        </div>
      </div>
    </main>
  );
}