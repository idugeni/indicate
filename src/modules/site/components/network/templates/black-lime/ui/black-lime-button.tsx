import type { ComponentProps } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/ui/cn';

/**
 * Tombol ghost gelap terkunci untuk template Black Lime.
 *
 * @param props - Props button shadcn yang diteruskan.
 * @returns Tombol close yang kebal terhadap root `.dark`.
 */
export function BlackLimeGhostButton({ className, ...props }: ComponentProps<typeof Button>) {
  return (
    <Button
      variant="ghost"
      {...props}
      className={cn(
        'bg-transparent text-[#646b5e] hover:bg-[#242b1f] hover:text-slate-100 dark:bg-transparent dark:text-[#646b5e] dark:hover:bg-[#242b1f] dark:hover:text-slate-100',
        className,
      )}
    />
  );
}

/**
 * Tombol primer lime template Black Lime.
 *
 * @param props - Props button shadcn yang diteruskan.
 * @returns Tombol aksi primer konsisten.
 */
export function BlackLimePrimaryButton({ className, ...props }: ComponentProps<typeof Button>) {
  return (
    <Button
      {...props}
      className={cn('bg-[#c5f82a] font-sans font-bold text-[#0a0c07] hover:bg-[#9ecb14]', className)}
    />
  );
}
