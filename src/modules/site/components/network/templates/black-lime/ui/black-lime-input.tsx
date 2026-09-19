import type { ComponentProps } from 'react';

import { Input } from '@/components/ui/input';
import { cn } from '@/ui/cn';

const LIGHT_INPUT =
  'border-[#242b1f] bg-[#0a0c07] text-slate-100 placeholder:text-[#646b5e] focus-visible:border-[#c5f82a] focus-visible:ring-[#c5f82a]/20 dark:border-[#242b1f] dark:bg-[#0a0c07] dark:text-slate-100 dark:placeholder:text-[#646b5e] dark:focus-visible:border-[#c5f82a] dark:focus-visible:ring-[#c5f82a]/20';

/**
 * Input gelap terkunci untuk template Black Lime.
 *
 * @param props - Props input shadcn yang diteruskan.
 * @returns Input yang kebal terhadap root `.dark`.
 */
export function BlackLimeInput({ className, ...props }: ComponentProps<typeof Input>) {
  return <Input {...props} className={cn(LIGHT_INPUT, className)} />;
}
