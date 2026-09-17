import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Masuk',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-icon.png',
  },
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

/** Auth layout: minimal and free of site chrome/tenant theming so flows render identically everywhere. */
export default function AuthLayout({ children }: { readonly children: ReactNode }) {
  return <div className="min-h-screen bg-[#f4f2ec] text-[#1a2430] [color-scheme:light]">{children}</div>;
}