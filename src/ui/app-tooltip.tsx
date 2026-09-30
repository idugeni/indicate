'use client';

import type { ReactElement } from 'react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { APP_TOOLTIP_CONTENT } from '@/ui/tooltip';

export type AppTooltipProps = {
  /** Chip text; keep it aligned with the trigger's own `aria-label`. */
  readonly label: string;
  readonly side?: 'top' | 'right' | 'bottom' | 'left';
  /** Single focusable trigger, usually a `Button` or a truncating `span`. */
  readonly children: ReactElement;
};

/**
 * Hover hint for app chrome, wrapping the shadcn Tooltip with the dark chip.
 *
 * The trigger arrives as `children` so call sites keep writing plain JSX
 * instead of threading the element through `TooltipTrigger render={...}`.
 * Base UI merges the child's own ref into the trigger's, so triggers that
 * already hold a ref keep working.
 *
 * @param props.label - Text shown in the chip.
 * @param props.side - Chip placement relative to the trigger.
 * @param props.children - Single focusable trigger element.
 */
export function AppTooltip({ label, side = 'bottom', children }: AppTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent side={side} className={APP_TOOLTIP_CONTENT}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
