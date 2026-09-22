import type { ReactElement } from 'react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * Render a dashboard-styled hover hint for truncated chart text.
 *
 * @param tip - Full text shown in the tooltip; the trigger keeps its own truncated content.
 * @param children - Single trigger element (keeps its tag, classes, and semantics).
 * @returns Tooltip wrapper reusing the dashboard raised-surface style.
 */
export function ChartTip({ tip, children }: { readonly tip: string; readonly children: ReactElement }) {
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent className="border border-hairline bg-bg-raised font-mono text-[11px] text-paper">
        {tip}
      </TooltipContent>
    </Tooltip>
  );
}
