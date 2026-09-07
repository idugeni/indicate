import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Masuk',
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

/** Auth layout: minimal and free of site chrome/tenant theming so flows render identically everywhere. */
export default function AuthLayout({ children }: { readonly children: ReactNode }) {
  return <div className="min-h-screen bg-bg text-paper">{children}</div>;
}