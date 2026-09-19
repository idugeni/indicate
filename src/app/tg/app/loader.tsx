'use client';

import dynamic from 'next/dynamic';

const MiniAppClient = dynamic(() => import('./app-client').then((module) => module.MiniAppClient), {
  ssr: false,
  loading: () => (
    <main style={{ background: '#141126', color: '#f2eefc', minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      Memuat…
    </main>
  ),
});

export function MiniAppLoader() {
  return <MiniAppClient />;
}
