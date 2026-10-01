'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/** Polling interval matching the probe cron: data cannot change faster than this. */
const REFRESH_INTERVAL_MS = 15 * 60 * 1000;

function formatMoment(value: string): string {
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return value;
  return new Date(time).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Live indicator polling the public status snapshot on the probe cadence.
 *
 * @param props.generatedAt - Snapshot time rendered by the server.
 * @returns Ping dot, live/stale label, and snapshot time; refreshes the route on success.
 * @remarks Never polls while the tab is hidden: a hidden page cannot show
 * fresher data, so waking would only spend edge and origin budget for nobody.
 */
export function StatusLiveIndicator({ generatedAt }: { readonly generatedAt: string }) {
  const router = useRouter();
  const [stale, setStale] = useState(false);
  const [pulse, setPulse] = useState(0);
  useEffect(() => {
    let id = 0;
    const tick = async (): Promise<void> => {
      if (document.hidden) return;
      try {
        const response = await fetch('/api/status', { cache: 'no-store' });
        if (!response.ok) throw new Error(`status ${response.status}`);
        setStale(false);
        setPulse((tickCount) => tickCount + 1);
        router.refresh();
      } catch {
        setStale(true);
      }
    };
    const onVisible = (): void => {
      if (!document.hidden) void tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    id = window.setInterval(() => {
      void tick();
    }, REFRESH_INTERVAL_MS);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [router]);
  return (
    <div className="flex items-center gap-2" role="status" aria-live="polite">
      <span className="relative flex size-2" aria-hidden="true">
        <span
          key={pulse}
          className={`absolute inline-flex size-full rounded-full motion-safe:animate-ping ${stale ? 'bg-error/60' : 'bg-signal/60'}`}
        />
        <span className={`relative inline-flex size-2 rounded-full ${stale ? 'bg-error' : 'bg-signal'}`} />
      </span>
      <span className="tracking-wider">{stale ? 'DATA BASI — MENCOBA LAGI' : 'LIVE 15M CYCLE'}</span>
      <span className="tabular-nums text-paper-faint">{formatMoment(generatedAt)}</span>
    </div>
  );
}
