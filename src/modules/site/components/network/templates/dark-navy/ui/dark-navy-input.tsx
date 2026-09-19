import type { ComponentProps } from 'react';

import { Input } from '@/components/ui/input';
import { cn } from '@/ui/cn';

const LIGHT_INPUT =
  'border-[#1b2c4f] bg-[#070f22] text-[#eaf0fb] placeholder:text-[#5f6f8c] focus-visible:border-[#2f7bff] focus-visible:ring-[#2f7bff]/20 dark:border-[#1b2c4f] dark:bg-[#070f22] dark:text-[#eaf0fb] dark:placeholder:text-[#5f6f8c] dark:focus-visible:border-[#2f7bff] dark:focus-visible:ring-[#2f7bff]/20';

/**
 * Input terang terkunci untuk template Clean Blue.
 *
 * @param props - Props input shadcn yang diteruskan.
 * @returns Input yang kebal terhadap root `.dark`.
 */
export function DarkNavyInput({ className, ...props }: ComponentProps<typeof Input>) {
  return <Input {...props} className={cn(LIGHT_INPUT, className)} />;
}
