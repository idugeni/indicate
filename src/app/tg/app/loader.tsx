'use client';

import dynamic from 'next/dynamic';

const MiniAppClient = dynamic(() => import('./app-client').then((module) => module.MiniAppClient), {
  ssr: false,
  loading: () => (
    <main role="status" aria-busy="true" aria-label="Memuat" style={{ background: '#141126', color: '#f2eefc', minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span aria-hidden="true" style={{ width: '2rem', height: '2rem', borderRadius: '9999px', border: '3px solid rgba(242,238,252,0.2)', borderTopColor: '#f2eefc', animation: 'tg-loader-spin 0.9s linear infinite' }} />
      <style>{`@keyframes tg-loader-spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  ),
});

export function MiniAppLoader() {
  return <MiniAppClient />;
}
