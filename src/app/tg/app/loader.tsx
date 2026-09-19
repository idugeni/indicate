'use client';

import dynamic from 'next/dynamic';

const MiniAppClient = dynamic(() => import('./app-client').then((module) => module.MiniAppClient), {
  ssr: false,
  loading: () => (
    <main
      role="status"
      aria-busy="true"
      aria-label="Memuat"
      className="fixed inset-0 z-[100] grid place-items-center bg-[#141126] [padding:env(safe-area-inset-top)_env(safe-area-inset-right)_env(safe-area-inset-bottom)_env(safe-area-inset-left)]"
    >
      <span aria-hidden="true" className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#f2eefc]/20 border-t-[#f2eefc]" />
    </main>
  ),
});

export function MiniAppLoader() {
  return <MiniAppClient />;
}
