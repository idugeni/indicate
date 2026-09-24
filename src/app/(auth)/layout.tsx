import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { controlPlaneIcons } from '@/ui/site/metadata-guard';

export const metadata: Metadata = {
  title: 'Masuk',
  ...controlPlaneIcons(),
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

/** Auth layout: minimal and free of site chrome/tenant theming so flows render identically everywhere. */
export default function AuthLayout({ children }: { readonly children: ReactNode }) {
  return <div className="min-h-screen supports-[min-height:100svh]:min-h-svh bg-[#f4f2ec] text-[#1a2430] [color-scheme:light]">{children}</div>;
}