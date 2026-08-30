'use client';
import { useSyncExternalStore } from 'react';
const subscribe = () => () => undefined;
const siteNameSnapshot = () => document.body.dataset.publicSiteName ?? null;
const serverSnapshot = () => null;
export default function ErrorPage({ reset }: { readonly reset: () => void }) {
  const siteName = useSyncExternalStore(subscribe, siteNameSnapshot, serverSnapshot);
  return <main className="public-status public-shell" role="alert"><p className="eyebrow">Gangguan sementara</p><h1>{siteName === null ? 'Halaman belum dapat dimuat' : `${siteName} belum dapat dimuat`}</h1><p>Silakan coba kembali. Detail internal tidak ditampilkan.</p><button type="button" onClick={reset}>Coba lagi</button></main>;
}
