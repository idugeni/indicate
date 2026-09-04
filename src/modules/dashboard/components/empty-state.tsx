import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';
import { cn } from '@/ui/cn';

export interface EmptyStateProps {
  readonly title?: string;
  readonly description?: string;
  readonly action?: ReactNode;
  readonly icon?: ReactNode;
  readonly className?: string;
}

export function EmptyState({
  title = 'Tidak ada rekaman data',
  description = 'Tidak ditemukan entitas yang cocok dengan kriteria filter atau parameter pencarian saat ini.',
  action,
  icon,
  className,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex flex-col items-center gap-2 rounded-lg border border-dashed border-hairline-strong px-6 py-10 text-center sm:py-12',
        className
      )}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full border border-hairline bg-bg-raised text-paper-faint">
        {icon ?? <Inbox className="h-4 w-4" aria-hidden="true" />}
      </span>
      <h3 className="m-0 mt-2 font-sans text-sm font-semibold tracking-tight text-paper">
        {title}
      </h3>
      <p className="m-0 max-w-md font-sans text-sm leading-relaxed text-paper-dim">
        {description}
      </p>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
