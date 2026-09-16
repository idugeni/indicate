import type { ComponentProps } from 'react';

import { Input } from '@/components/ui/input';
import { cn } from '@/ui/cn';

const LIGHT_INPUT =
  'border-slate-200 bg-[#f5f8fd] text-slate-900 placeholder:text-slate-400 focus-visible:border-[#1a5fd0] focus-visible:ring-[#1a5fd0]/20 dark:border-slate-200 dark:bg-[#f5f8fd] dark:text-slate-900 dark:placeholder:text-slate-400 dark:focus-visible:border-[#1a5fd0] dark:focus-visible:ring-[#1a5fd0]/20';

/**
 * Input terang terkunci untuk template Clean Blue.
 *
 * @param props - Props input shadcn yang diteruskan.
 * @returns Input yang kebal terhadap root `.dark`.
 */
export function CleanBlueInput({ className, ...props }: ComponentProps<typeof Input>) {
  return <Input {...props} className={cn(LIGHT_INPUT, className)} />;
}
