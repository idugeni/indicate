import type { ComponentProps } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/ui/cn';

/**
 * Tombol ghost terang terkunci untuk template Clean Blue.
 *
 * @param props - Props button shadcn yang diteruskan.
 * @returns Tombol close yang kebal terhadap root `.dark`.
 */
export function GreenMinimalGhostButton({ className, ...props }: ComponentProps<typeof Button>) {
  return (
    <Button
      variant="ghost"
      {...props}
      className={cn(
        'bg-transparent text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:bg-transparent dark:text-slate-400 dark:hover:bg-slate-100 dark:hover:text-slate-700',
        className,
      )}
    />
  );
}

/**
 * Tombol primer biru template Clean Blue.
 *
 * @param props - Props button shadcn yang diteruskan.
 * @returns Tombol aksi primer konsisten.
 */
export function GreenMinimalPrimaryButton({ className, ...props }: ComponentProps<typeof Button>) {
  return (
    <Button
      {...props}
      className={cn('bg-[#1d7a38] font-sans font-bold text-white hover:bg-[#145c2a]', className)}
    />
  );
}
