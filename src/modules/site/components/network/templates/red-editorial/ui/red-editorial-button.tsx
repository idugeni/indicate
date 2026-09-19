import type { ComponentProps } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/ui/cn';

/**
 * Tombol ghost terang terkunci untuk template Clean Blue.
 *
 * @param props - Props button shadcn yang diteruskan.
 * @returns Tombol close yang kebal terhadap root `.dark`.
 */
export function RedEditorialGhostButton({ className, ...props }: ComponentProps<typeof Button>) {
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
export function RedEditorialPrimaryButton({ className, ...props }: ComponentProps<typeof Button>) {
  return (
    <Button
      {...props}
      className={cn('bg-[#b91c1c] font-sans font-bold text-white hover:bg-[#7f1212]', className)}
    />
  );
}
