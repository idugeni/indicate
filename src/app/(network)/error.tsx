'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TriangleAlert } from 'lucide-react';
import { currentRoutePath, reportClientFault } from '@/core/observability/client-report';
import { Button } from '@/components/ui/button';

interface ErrorPageProps {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}

/** Galat tenant: terang gaya portal, telemetri dan Ref sama seperti control-plane. */
export default function NetworkErrorPage({ error, reset }: ErrorPageProps) {
  const [clientId] = useState(() => crypto.randomUUID());
  const eventId = error.digest ?? clientId;

  useEffect(() => {
    reportClientFault({ digest: error.digest, eventId: clientId, errorName: error.name, route: currentRoutePath(), boundary: 'app/(network)/error' });
  }, [error, clientId]);

  return (
    <main
      role="alert"
      aria-live="assertive"
      className="flex min-h-screen supports-[min-height:100svh]:min-h-svh items-center justify-center bg-[#f5f8fd] [padding:max(1.5rem,env(safe-area-inset-top))_max(1.5rem,env(safe-area-inset-right))_max(1.5rem,env(safe-area-inset-bottom))_max(1.5rem,env(safe-area-inset-left))]"
    >
      <div className="mx-auto w-full max-w-lg rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200/70">
        <p className="m-0 inline-flex items-center gap-2 font-sans text-xs font-bold uppercase tracking-wider text-[#1a5fd0]">
          <TriangleAlert className="h-4 w-4" aria-hidden="true" />
          Gangguan sementara
        </p>
        <h1 className="m-0 mt-3 font-sans text-2xl font-extrabold tracking-tight text-slate-900">
          Halaman belum dapat dimuat
        </h1>
        <p className="m-0 mt-3 font-sans text-sm leading-relaxed text-slate-600">
          Terjadi hambatan saat merender halaman. Permintaan telah dihentikan secara aman
          dan rincian teknis internal tidak dipaparkan ke publik.
        </p>
        <p className="m-0 mt-4 font-mono text-xs tabular-nums text-slate-400">
          Ref: <code suppressHydrationWarning>{eventId}</code>
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2.5">
          <Button
            type="button"
            onClick={reset}
            className="h-10 rounded-full bg-[#1a5fd0] px-5 font-sans text-sm font-bold text-white hover:bg-[#155cb8]"
          >
            Coba lagi
          </Button>
          <Link
            href="/"
            className="inline-flex h-10 items-center justify-center rounded-full px-5 font-sans text-sm font-bold text-slate-600 ring-1 ring-slate-200 transition-colors hover:text-[#1a5fd0]"
          >
            Kembali ke beranda
          </Link>
        </div>
      </div>
    </main>
  );
}
