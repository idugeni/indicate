import type { Viewport } from 'next';
import type { ReactNode } from 'react';

/** Light tenant: browser chrome stays light on all portal pages. */
export const viewport: Viewport = {
  themeColor: '#ffffff',
  colorScheme: 'light',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function NetworkLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  // Tetap sinkron: layout async yang suspend menampilkan loading milik segmen
  // induk (spinner root) karena (network)/loading hanya menutupi children.
  // Guard host sudah di tiap halaman via resolveNetworkSite.
  return <>{children}</>;
}
