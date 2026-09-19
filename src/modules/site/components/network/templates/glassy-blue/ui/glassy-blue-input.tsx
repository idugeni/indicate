import type { ComponentProps } from 'react';

import { Input } from '@/components/ui/input';
import { cn } from '@/ui/cn';

const LIGHT_INPUT =
  'border-slate-200 bg-[#edf4ff] text-slate-900 placeholder:text-slate-400 focus-visible:border-[#1f7cff] focus-visible:ring-[#1f7cff]/20 dark:border-slate-200 dark:bg-[#edf4ff] dark:text-slate-900 dark:placeholder:text-slate-400 dark:focus-visible:border-[#1f7cff] dark:focus-visible:ring-[#1f7cff]/20';

/**
 * Input terang terkunci untuk template Clean Blue.
 *
 * @param props - Props input shadcn yang diteruskan.
 * @returns Input yang kebal terhadap root `.dark`.
 */
export function GlassyBlueInput({ className, ...props }: ComponentProps<typeof Input>) {
  return <Input {...props} className={cn(LIGHT_INPUT, className)} />;
}
