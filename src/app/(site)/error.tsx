'use client';

import { useEffect, useState } from 'react';
import { currentRoutePath, reportClientFault } from '@/core/observability/client-report';
import { Button } from '@/components/ui/button';

/** Site error boundary: non-disclosing retry + generic message + support Ref, consistent with control-plane denials. */
export default function SiteError({
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
      boundary: 'app/(site)/error',
    });
  }, [error, clientId]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6" role="alert">
      <div className="w-full max-w-md rounded-[3px] border border-[#e2ded2] bg-white p-8 text-center">
        <p className="m-0 font-mono text-xs font-medium uppercase tracking-wider text-[#b3261e]">Gangguan sementara</p>
        <h1 className="m-0 mt-2 font-sans text-xl font-bold tracking-tight text-[#1a2430]">Halaman layanan belum dapat dimuat</h1>
        <p className="m-0 mt-2 font-sans text-sm leading-relaxed text-[#4c5b6b]">Silakan coba kembali. Detail internal tidak ditampilkan.</p>
        <p className="m-0 mt-3 font-mono text-xs tabular-nums text-[#5f6b7a]">
          {/* Fallback Ref differs between prerender and hydration by design; suppress this leaf only. */}
          Ref: <code className="text-[#4c5b6b]" suppressHydrationWarning>{eventId}</code>
        </p>
        <div className="mt-5">
          <Button type="button" onClick={reset}>Coba lagi</Button>
        </div>
      </div>
    </div>
  );
}
