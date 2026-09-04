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
        'flex flex-col items-start gap-2 border-t-2 border-hairline py-8',
        className
      )}
    >
      <span className="flex items-center gap-2 font-sans text-sm font-semibold text-paper">
        {icon ?? <Inbox className="h-4 w-4 text-paper-faint" aria-hidden="true" />}
        {title}
      </span>
      <p className="m-0 max-w-md font-sans text-sm leading-relaxed text-paper-dim">
        {description}
      </p>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
