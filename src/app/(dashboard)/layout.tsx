import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { DashboardProviders } from '@/app/(dashboard)/dashboard-providers';
import { controlPlaneIcons } from '@/ui/site/metadata-guard';

export const metadata: Metadata = {
  title: 'Dashboard',
  ...controlPlaneIcons(),
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

export default function DashboardLayout({ children }: { readonly children: ReactNode }) {
  return (
    <DashboardProviders>
      <div className="dashboard-scroll">{children}</div>
    </DashboardProviders>
  );
}
