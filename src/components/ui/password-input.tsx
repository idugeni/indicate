'use client';

import * as React from 'react';
import { Eye, EyeOff } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { cn } from '@/ui/cn';

/**
 * Password field with a show/hide eye toggle.
 *
 * @param toggleClassName - Extra classes for the eye button; defaults to theme-aware muted tones.
 * @returns The password input with an inset visibility toggle.
 */
function PasswordInput({
  className,
  toggleClassName,
  ...props
}: Omit<React.ComponentProps<'input'>, 'type'> & { readonly toggleClassName?: string }) {
  const [visible, setVisible] = React.useState(false);

  return (
    <div className="relative">
      <Input type={visible ? 'text' : 'password'} className={cn('pr-10', className)} {...props} />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-pressed={visible}
        aria-label={visible ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
        className={cn(
          'absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
          toggleClassName,
        )}
      >
        {visible ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
      </button>
    </div>
  );
}

export { PasswordInput };
