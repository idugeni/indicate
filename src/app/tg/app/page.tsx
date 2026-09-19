import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

const MiniAppClient = dynamic(() => import('./app-client').then((module) => module.MiniAppClient), {
  ssr: false,
  loading: () => <main style={{ background: '#141126', color: '#f2eefc', minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Memuat…</main>,
});

export const metadata: Metadata = {
  title: 'Indicate Mini App',
  robots: { index: false, follow: false },
};

export default function MiniAppPage() {
  return <MiniAppClient />;
}
