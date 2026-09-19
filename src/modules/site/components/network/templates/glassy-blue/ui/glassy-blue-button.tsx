import type { ComponentProps } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/ui/cn';

/**
 * Tombol ghost terang terkunci untuk template Clean Blue.
 *
 * @param props - Props button shadcn yang diteruskan.
 * @returns Tombol close yang kebal terhadap root `.dark`.
 */
export function GlassyBlueGhostButton({ className, ...props }: ComponentProps<typeof Button>) {
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
export function GlassyBluePrimaryButton({ className, ...props }: ComponentProps<typeof Button>) {
  return (
    <Button
      {...props}
      className={cn('bg-[#1f7cff] font-sans font-bold text-white hover:bg-[#155fd0]', className)}
    />
  );
}
