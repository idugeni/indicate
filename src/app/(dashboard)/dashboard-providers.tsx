'use client';

import type { ReactNode } from 'react';
import { NuqsAdapter } from 'nuqs/adapters/next/app';

export function DashboardProviders({ children }: { readonly children: ReactNode }) {
  return <NuqsAdapter>{children}</NuqsAdapter>;
}
