'use client';

import { useEffect, useState } from 'react';
import { currentRoutePath, reportClientFault } from '@/core/observability/client-report';
import { Button } from '@/components/ui/button';

/** Dashboard error boundary: non-disclosing retry + sanitized message + support Ref, never internal detail. */
export default function DashboardError({
  error,
  reset,
}: {
  readonly error?: Error & { digest?: string };
  readonly reset: () => void;
}) {
  const [clientId] = useState(() => crypto.randomUUID());
  const eventId = error?.digest ?? clientId;

  useEffect(() => {
    reportClientFault({
      digest: error?.digest,
      eventId: clientId,
      errorName: error?.name ?? 'UnknownError',
      route: currentRoutePath(),
      boundary: 'app/(dashboard)/error',
    });
  }, [error, clientId]);

  return (
    <main className="flex min-h-[50vh] items-center justify-center p-6" role="alert">
      <div className="w-full max-w-md border-t-2 border-error pt-6">
        <p className="m-0 font-mono text-xs font-medium uppercase tracking-wider text-error">Gangguan sementara</p>
        <h1 className="m-0 mt-2 font-sans text-xl font-bold tracking-tight text-paper">Ruang redaksi belum dapat dimuat</h1>
        <p className="m-0 mt-2 font-sans text-sm leading-relaxed text-paper-dim">Silakan muat ulang atau coba kembali. Detail internal tidak ditampilkan.</p>
        <p className="m-0 mt-3 font-mono text-xs tabular-nums text-paper-faint">
          {/* Fallback Ref differs between prerender and hydration by design; suppress this leaf only. */}
          Ref: <code className="text-paper-dim" suppressHydrationWarning>{eventId}</code>
        </p>
        <div className="mt-5">
          <Button type="button" onClick={reset}>Coba lagi</Button>
        </div>
      </div>
    </main>
  );
}
