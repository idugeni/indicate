'use client';

import type { ReactElement } from 'react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { TEMPLATE_TOOLTIP_CONTENT } from '@/ui/tooltip';

export type TemplateTooltipProps = {
  /** Chip text; keep it aligned with the trigger's own `aria-label`. */
  readonly label: string;
  readonly side?: 'top' | 'right' | 'bottom' | 'left';
  /** Single focusable trigger, usually an icon-only link or button. */
  readonly children: ReactElement;
};

/**
 * Hover hint for public template chrome, replacing the browser's native `title`.
 *
 * The trigger arrives as `children` rather than a `render` prop so server
 * components can wrap host elements without passing a function across the RSC
 * boundary.
 */
export function TemplateTooltip({ label, side = 'bottom', children }: TemplateTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent side={side} className={TEMPLATE_TOOLTIP_CONTENT}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
