import type { ComponentProps } from 'react';

import { Input } from '@/components/ui/input';
import { cn } from '@/ui/cn';

const LIGHT_INPUT =
  'border-slate-200 bg-[#f8f7ff] text-slate-900 placeholder:text-slate-400 focus-visible:border-[#7c3aed] focus-visible:ring-[#7c3aed]/20 dark:border-slate-200 dark:bg-[#f8f7ff] dark:text-slate-900 dark:placeholder:text-slate-400 dark:focus-visible:border-[#7c3aed] dark:focus-visible:ring-[#7c3aed]/20';

/**
 * Input terang terkunci untuk template Clean Blue.
 *
 * @param props - Props input shadcn yang diteruskan.
 * @returns Input yang kebal terhadap root `.dark`.
 */
export function PurpleEditorialInput({ className, ...props }: ComponentProps<typeof Input>) {
  return <Input {...props} className={cn(LIGHT_INPUT, className)} />;
}
