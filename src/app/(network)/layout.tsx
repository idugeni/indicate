import type { Viewport } from 'next';
import type { ReactNode } from 'react';

/** Tenant terang: browser chrome ikut terang di semua halaman portal. */
export const viewport: Viewport = {
  themeColor: '#ffffff',
  colorScheme: 'light',
  width: 'device-width',
  initialScale: 1,
};

export default function NetworkLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return <>{children}</>;
}
