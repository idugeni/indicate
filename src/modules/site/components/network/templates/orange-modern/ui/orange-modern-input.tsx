import type { ComponentProps } from 'react';

import { Input } from '@/components/ui/input';
import { cn } from '@/ui/cn';

const LIGHT_INPUT =
  'border-slate-200 bg-[#fff9f4] text-slate-900 placeholder:text-slate-400 focus-visible:border-[#ea580c] focus-visible:ring-[#ea580c]/20 dark:border-slate-200 dark:bg-[#fff9f4] dark:text-slate-900 dark:placeholder:text-slate-400 dark:focus-visible:border-[#ea580c] dark:focus-visible:ring-[#ea580c]/20';

/**
 * Input terang terkunci untuk template Clean Blue.
 *
 * @param props - Props input shadcn yang diteruskan.
 * @returns Input yang kebal terhadap root `.dark`.
 */
export function OrangeModernInput({ className, ...props }: ComponentProps<typeof Input>) {
  return <Input {...props} className={cn(LIGHT_INPUT, className)} />;
}
