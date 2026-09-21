import type { ComponentProps } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/ui/cn';

/**
 * Shared tenant field theme classes; combine via `templateFieldClasses()`.
 *
 * @remarks
 * Single source for `--tpl-*` colors so shadcn looks explicit without duplication.
 */
export const TEMPLATE_FIELD_CLASSES =
  'border-[var(--tpl-ring,#e2e8f0)] bg-[var(--tpl-canvas,#f5f8fd)] text-[var(--tpl-ink,#0f172a)] [color-scheme:var(--tpl-scheme,light)] placeholder:text-[var(--tpl-faint,#94a3b8)] focus-visible:border-[var(--tpl-primary,#1a5fd0)] focus-visible:ring-[var(--tpl-primary-soft,#e8f0fe)] dark:border-[var(--tpl-ring,#e2e8f0)] dark:bg-[var(--tpl-canvas,#f5f8fd)] dark:text-[var(--tpl-ink,#0f172a)] dark:placeholder:text-[var(--tpl-faint,#94a3b8)] dark:focus-visible:border-[var(--tpl-primary,#1a5fd0)] dark:focus-visible:ring-[var(--tpl-primary-soft,#e8f0fe)] dark:disabled:bg-[var(--tpl-canvas,#f5f8fd)]';

/**
 * Apply the shared tenant field theme over shadcn primitives.
 *
 * @param className - Caller shape classes appended after the theme.
 * @returns Theme classes merged with the caller classes.
 */
export function templateFieldClasses(className?: string): string {
  return cn(TEMPLATE_FIELD_CLASSES, className);
}

/**
 * Apply the shared tenant primary button theme.
 *
 * @param className - Caller shape classes appended after the theme.
 * @returns Theme classes merged with the caller classes.
 */
export function templateButtonPrimaryClasses(className?: string): string {
  return cn(
    'bg-[var(--tpl-primary,#1a5fd0)] font-sans font-bold text-[var(--tpl-on-primary,#ffffff)] hover:bg-[var(--tpl-primary-dark,#155cb8)] dark:bg-[var(--tpl-primary,#1a5fd0)] dark:text-[var(--tpl-on-primary,#ffffff)] dark:hover:bg-[var(--tpl-primary-dark,#155cb8)]',
    className,
  );
}

/**
 * Apply the shared tenant ghost button theme.
 *
 * @param className - Caller shape classes appended after the theme.
 * @returns Theme classes merged with the caller classes.
 */
export function templateButtonGhostClasses(className?: string): string {
  return cn(
    'bg-transparent text-[var(--tpl-faint,#94a3b8)] hover:bg-[var(--tpl-ring,#e2e8f0)] hover:text-[var(--tpl-ink,#0f172a)] dark:bg-transparent dark:text-[var(--tpl-faint,#94a3b8)] dark:hover:bg-[var(--tpl-ring,#e2e8f0)] dark:hover:text-[var(--tpl-ink,#0f172a)]',
    className,
  );
}

/**
 * Text input following the active template theme via `--tpl-*`.
 *
 * @param props - Forwarded shadcn input props.
 * @returns Input immune to the `.dark` root; colors from the shell, shape from the caller.
 */
export function TemplateInput({ className, ...props }: ComponentProps<typeof Input>) {
  return <Input {...props} className={templateFieldClasses(className)} />;
}

/**
 * Textarea following the active template theme via `--tpl-*`.
 *
 * @param props - Forwarded shadcn textarea props.
 * @returns Textarea immune to the `.dark` root; colors from the shell, shape from the caller.
 */
export function TemplateTextarea({ className, ...props }: ComponentProps<typeof Textarea>) {
  return <Textarea {...props} className={templateFieldClasses(className)} />;
}

/**
 * Native select following the active template theme via `--tpl-*`.
 *
 * @param props - Forwarded select props.
 * @returns Select immune to the `.dark` root; colors from the shell, shape from the caller.
 */
export function TemplateSelect({ className, ...props }: ComponentProps<'select'>) {
  return <select {...props} className={templateFieldClasses(className)} />;
}

/**
 * Template button props; `className` is intentionally a string so it merges via `cn()`.
 */
export type TemplateButtonProps = Omit<ComponentProps<typeof Button>, 'variant' | 'className'> & {
  readonly variant?: 'primary' | 'ghost';
  readonly className?: string | undefined;
};

/**
 * Action button following the active template theme via `--tpl-*`.
 *
 * @param props - Shadcn button props plus the `primary`/`ghost` variant.
 * @returns Button immune to the `.dark` root; colors from the shell, shape from the caller.
 */
export function TemplateButton({ className, variant = 'primary', ...props }: TemplateButtonProps) {
  if (variant === 'ghost') {
    return <Button variant="ghost" {...props} className={templateButtonGhostClasses(className)} />;
  }
  return <Button {...props} className={templateButtonPrimaryClasses(className)} />;
}
