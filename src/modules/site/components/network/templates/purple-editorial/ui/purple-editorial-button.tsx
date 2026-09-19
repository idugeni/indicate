import type { ComponentProps } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/ui/cn';

/**
 * Tombol ghost terang terkunci untuk template Clean Blue.
 *
 * @param props - Props button shadcn yang diteruskan.
 * @returns Tombol close yang kebal terhadap root `.dark`.
 */
export function PurpleEditorialGhostButton({ className, ...props }: ComponentProps<typeof Button>) {
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
export function PurpleEditorialPrimaryButton({ className, ...props }: ComponentProps<typeof Button>) {
  return (
    <Button
      {...props}
      className={cn('bg-[#7c3aed] font-sans font-bold text-white hover:bg-[#5f21d6]', className)}
    />
  );
}
