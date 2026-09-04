import type { ReactNode } from 'react';
import { cn } from '@/ui/cn';

export interface StatTrend {
  readonly value: string;
  readonly isPositive?: boolean;
}

export interface StatCardProps {
  readonly title: string;
  readonly value: string;
  readonly icon?: ReactNode;
  readonly description?: string;
  readonly trend?: StatTrend;
  readonly className?: string;
}

export function StatCard({
  icon,
  title,
  value,
  description,
  trend,
  className,
}: StatCardProps) {
  const isPositive = trend?.isPositive ?? true;

  return (
    <div className={cn('border-l-2 border-hairline-strong pl-4', className)}>
      <p className="m-0 flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-paper-faint">
        {icon ? <span className="flex items-center text-brass" aria-hidden="true">{icon}</span> : null}
        {title}
      </p>
      <p className="m-0 mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-mono text-2xl font-bold tabular-nums tracking-tight text-paper sm:text-3xl">
          {value}
        </span>
        {trend ? (
          <span
            className={cn(
              'font-mono text-[11px] tabular-nums',
              isPositive ? 'text-signal' : 'text-error',
            )}
          >
            {trend.value}
          </span>
        ) : null}
      </p>
      {description ? (
        <p className="m-0 mt-1.5 font-sans text-xs leading-relaxed text-paper-dim">
          {description}
        </p>
      ) : null}
    </div>
  );
}
