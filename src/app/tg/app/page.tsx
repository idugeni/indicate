import type { Metadata } from 'next';

import { MiniAppLoader } from './loader';

export const metadata: Metadata = {
  title: 'Indicate Mini App',
  robots: { index: false, follow: false },
};

export default function MiniAppPage() {
  return <MiniAppLoader />;
}
