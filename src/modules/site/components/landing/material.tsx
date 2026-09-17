import type { ReactNode } from 'react';
import { cn } from '@/ui/cn';

export const GLASS_TRANSPARENT =
  'border border-white/50 bg-white/40 shadow-[0_8px_24px_-20px_rgba(26,36,48,0.35)] ring-1 ring-[#1a2430]/5 backdrop-blur-md';

export const GLASS_STANDARD =
  'border border-white/70 bg-white/70 shadow-[0_20px_48px_-28px_rgba(26,36,48,0.35)] ring-1 ring-[#1a2430]/5 backdrop-blur-xl';

export const GLASS_ELEVATED =
  'border border-white/80 bg-white/85 shadow-[0_32px_72px_-32px_rgba(26,36,48,0.4)] ring-1 ring-[#1a2430]/10 backdrop-blur-xl';

export const GLASS_HIGHLIGHTED =
  'border border-[#e3d3a8]/80 bg-[#f8efdb]/80 shadow-[0_20px_48px_-28px_rgba(138,95,28,0.45)] ring-1 ring-[#8a5f1c]/10 backdrop-blur-xl';

export function Eyebrow({ children, index }: { readonly children: ReactNode; readonly index?: string }) {
  return (
    <p className="m-0 flex items-center gap-2.5 font-mono text-[11px] font-medium tracking-[0.14em] text-[#8a5f1c] uppercase">
      {index ? (
        <span aria-hidden="true" className="tabular-nums">
          {index}
        </span>
      ) : null}
      <span aria-hidden="true" className="h-px w-8 flex-none bg-[#b88d3a]" />
      {children}
    </p>
  );
}

export function SectionShell({
  labelledBy,
  className,
  children,
}: {
  readonly labelledBy?: string;
  readonly className?: string;
  readonly children: ReactNode;
}) {
  return (
    <section aria-labelledby={labelledBy} className={cn('mx-auto w-full max-w-7xl px-5 sm:px-8', className)}>
      {children}
    </section>
  );
}
