import type { ComponentProps } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/ui/cn';

/**
 * Tombol ghost terang terkunci untuk template Clean Blue.
 *
 * @param props - Props button shadcn yang diteruskan.
 * @returns Tombol close yang kebal terhadap root `.dark`.
 */
export function DarkNavyGhostButton({ className, ...props }: ComponentProps<typeof Button>) {
  return (
    <Button
      variant="ghost"
      {...props}
      className={cn(
        'bg-transparent text-[#5f6f8c] hover:bg-[#14294f] hover:text-[#9aa9c4] dark:bg-transparent dark:text-[#5f6f8c] dark:hover:bg-[#14294f] dark:hover:text-[#9aa9c4]',
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
export function DarkNavyPrimaryButton({ className, ...props }: ComponentProps<typeof Button>) {
  return (
    <Button
      {...props}
      className={cn('bg-[#2f7bff] font-sans font-bold text-white hover:bg-[#1a5fd0]', className)}
    />
  );
}
