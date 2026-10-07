'use client';

import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDashboardPage } from '@/modules/dashboard/components/shared/use-dashboard-query';

export function DashboardWorkspace({
  children,
  onRefresh,
}: {
  readonly children: React.ReactNode;
  readonly onRefresh?: (() => Promise<void>) | undefined;
}) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (onRefresh === undefined || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-bg">
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-hairline bg-bg/80 px-4 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold tracking-tight text-paper">Dashboard</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="text-paper-faint hover:text-paper"
            aria-label="Muat ulang data"
          >
            <RefreshCw className={`size-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </header>
      <main className="flex-1 p-4 lg:p-8">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
