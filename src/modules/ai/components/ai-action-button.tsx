'use client';

import type { ComponentProps, ReactElement } from 'react';
import { Loader2, type LucideIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/ui/cn';

export type AiActionButtonProps = {
  /**
   * True only for the action the editor just started, never for sibling actions
   * in the same panel, so one click cannot make every button read as running.
   */
  readonly busy: boolean;
  readonly idleLabel: string;
  /** Omit for a text-only action such as "Terapkan semua". */
  readonly icon?: LucideIcon;
  readonly onClick: () => void;
  readonly disabled?: boolean;
  /** `primary` fills brass for a field's main action; `secondary` keeps a raised outline. */
  readonly tone?: 'primary' | 'secondary';
  readonly size?: 'xs' | 'sm';
  readonly ariaLabel?: string;
  readonly className?: string;
  readonly ref?: ComponentProps<typeof Button>['ref'];
};

/**
 * One AI action control with a readable surface and its own progress state.
 *
 * The dashboard panels sit on `bg-bg`, which is also what the shadcn `outline`
 * and `ghost` variants paint, so an AI button rendered with them reads as plain
 * text. `primary` fills brass and `secondary` steps up to `bg-raised` with a
 * `hairline-strong` edge, which keeps both legible on the dark surface.
 *
 * @param props - Action identity, per-action busy flag, and the click handler.
 * @returns Button that swaps its icon for a spinner and pulses brass while busy.
 */
export function AiActionButton({
  busy,
  idleLabel,
  icon,
  onClick,
  disabled = false,
  tone = 'secondary',
  size = 'sm',
  ariaLabel,
  className,
  ref,
}: AiActionButtonProps) {
  const Icon = icon;
  return (
    <Button
      ref={ref}
      type="button"
      size={size}
      variant="ghost"
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
      aria-busy={busy}
      data-slot="ai-action"
      className={cn(
        'gap-1.5 font-sans transition-colors duration-180',
        // A filled brass surface needs dark text in every state. `brass-soft`
        // text on `brass` measures 1.38:1, so the busy tint applies to the
        // raised surface only, and the primary keeps `text-bg` while busy.
        tone === 'primary'
          ? busy
            ? 'border border-brass bg-brass text-bg'
            : 'border border-brass/60 bg-brass text-bg hover:bg-brass-soft'
          : busy
            ? 'border border-brass bg-bg-raised-2 text-brass-soft'
            : 'border border-hairline-strong bg-bg-raised text-paper hover:bg-bg-raised-2',
        busy && 'cursor-progress',
        // A sibling held back by a running action must read as inert, never as
        // busy: flat surface, no brass tint, no glow, and no spinner because
        // only a busy button renders one.
        disabled && tone === 'primary' && 'border-hairline-strong bg-bg-raised text-paper-dim hover:bg-bg-raised-2',
        disabled && tone === 'secondary' && 'border-hairline bg-bg text-paper-faint hover:bg-bg',
        busy && tone === 'secondary' && 'ai-busy-glow',
        className,
      )}
    >
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
      ) : Icon === undefined ? null : (
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      <span>{busy ? 'Memproses…' : idleLabel}</span>
    </Button>
  );
}

export type AiPendingProps = {
  /** Short status sentence naming what is being produced. */
  readonly label: string;
  readonly rows?: readonly number[];
};

/**
 * Placeholder that occupies the result area while an AI action is running.
 *
 * The result previously appeared with no transition from empty, so a slow call
 * looked like a dead button. The shimmer reserves the space and marks exactly
 * where the answer will land.
 *
 * @param props - Status label plus the shimmer bar widths, in percent.
 * @returns Live status region with shimmering placeholder rows.
 */
export function AiPending({ label, rows = [100, 86, 64] }: AiPendingProps) {
  return (
    <div role="status" aria-live="polite" className="space-y-2 rounded border border-hairline bg-bg-raised/60 p-2.5">
      <p className="m-0 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-brass-soft">
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
        {label}
      </p>
      <div className="space-y-1.5" aria-hidden="true">
        {rows.map((width, index) => (
          <div
            key={width}
            className="ai-shimmer h-2.5 rounded"
            style={{ width: `${width}%`, animationDelay: `${index * 160}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

export type AiActionGroupProps = {
  readonly children: ReactElement | readonly ReactElement[];
  readonly label: string;
};

/**
 * Row that hosts AI action controls and announces the active one.
 *
 * @param props - Group label plus the action controls.
 * @returns Labelled row with a polite live region for progress text.
 */
export function AiActionGroup({ children, label }: AiActionGroupProps) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-1.5">
      {children}
    </div>
  );
}
