'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { currentRoutePath, reportClientFault } from '@/core/observability/client-report';

interface GlobalErrorProps {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}

/** Root error boundary with self-contained styles so it renders even when the global CSS bundle fails. */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  const [clientId] = useState(() => crypto.randomUUID());
  const eventId = error.digest ?? clientId;

  useEffect(() => {
    // Telemetry carries structure only (no message/stack); the Ref joins to the server `server.fault` record.
    reportClientFault({ digest: error.digest, eventId: clientId, errorName: error.name, route: currentRoutePath(), boundary: 'app/global-error' });
  }, [error, clientId]);

  return (
    <html lang="id" style={{ colorScheme: 'dark' }}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex, nofollow" />
        <meta name="theme-color" content="#0e1320" />
        <title>Layanan Tidak Tersedia · Indicate</title>
        <style>{`
          *, *::before, *::after { box-sizing: border-box; }
          body {
            margin: 0;
            background-color: #0e1320;
            color: #edeadd;
            font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            -webkit-font-smoothing: antialiased;
            display: flex;
            min-height: 100vh;
            align-items: center;
            justify-content: center;
            padding: 1.5rem;
          }
          .error-card {
            width: 100%;
            max-width: 32rem;
            border-top: 2px solid #d9705f;
            padding-top: 1.5rem;
          }
          .eyebrow {
            margin: 0 0 0.5rem;
            font-family: 'IBM Plex Mono', ui-monospace, Menlo, Consolas, monospace;
            font-size: 0.78rem;
            letter-spacing: 0.04em;
            color: #d9705f;
            font-weight: 500;
          }
          h1 {
            margin: 0 0 0.75rem;
            font-size: 1.5rem;
            font-weight: 600;
            letter-spacing: -0.02em;
            color: #edeadd;
          }
          p {
            margin: 0 0 1rem;
            font-size: 0.94rem;
            line-height: 1.6;
            color: #9fa6b8;
          }
          .digest-box {
            margin: 1.25rem 0;
            padding: 0.75rem 0;
            border-top: 1px solid #2a3348;
            border-bottom: 1px solid #2a3348;
            font-family: 'IBM Plex Mono', ui-monospace, Menlo, Consolas, monospace;
            font-size: 0.8rem;
            color: #6b7284;
            display: flex;
            align-items: baseline;
            gap: 0.5rem;
            word-break: break-all;
          }
          .digest-box code {
            color: #e4b96a;
          }
          .actions {
            display: flex;
            gap: 0.75rem;
            margin-top: 1.5rem;
            flex-wrap: wrap;
            align-items: center;
          }
          button, a {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 0.6rem 1rem;
            font-size: 0.9rem;
            font-weight: 600;
            border-radius: 3px;
            cursor: pointer;
            text-decoration: none;
            font-family: inherit;
            transition: all 180ms cubic-bezier(0.4, 0, 0.2, 1);
          }
          .btn-primary {
            background-color: #cc9a44;
            color: #0e1320;
            border: 1px solid transparent;
          }
          .btn-primary:hover {
            background-color: #e4b96a;
          }
          .btn-ghost {
            background-color: transparent;
            color: #9fa6b8;
            border: 1px solid #3a4560;
          }
          .btn-ghost:hover {
            background-color: #1c2436;
            color: #edeadd;
          }
          button:focus-visible, a:focus-visible {
            outline: 2px solid #e4b96a;
            outline-offset: 2px;
          }
        `}</style>
      </head>
      <body>
        <main className="error-card" role="alert" aria-live="assertive">
          <p className="eyebrow">500 · System Fault</p>
          <h1>Layanan tidak tersedia</h1>
          <p>
            Terjadi kegagalan tingkat sistem yang tidak terduga. Permintaan Anda dihentikan
            secara aman dan tidak ada perubahan data yang dilakukan.
          </p>

          <div className="digest-box">
            <span>Ref:</span>
            {/* Fallback Ref differs between prerender and hydration by design; suppress this leaf only. */}
            <code suppressHydrationWarning>{eventId}</code>
          </div>

          <div className="actions">
            <button type="button" className="btn-primary" onClick={reset}>
              Coba lagi
            </button>
            <Link href="/" className="btn-ghost">
              Muat ulang beranda
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}