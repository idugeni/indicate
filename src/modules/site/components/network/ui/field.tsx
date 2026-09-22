import type { ComponentProps, ReactNode } from 'react';
import { CircleCheck, TriangleAlert } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
 * Option for {@link TemplateMenuSelect}.
 */
export interface TemplateOption {
  readonly value: string;
  readonly label: string;
}

/**
 * Form label following the active template theme via `--tpl-*`.
 *
 * @param props - Forwarded shadcn label props.
 * @returns Label in the tenant muted tone.
 */
export function TemplateLabel({ className, ...props }: ComponentProps<typeof Label>) {
  return <Label {...props} className={cn('font-sans text-xs font-medium text-[var(--tpl-muted,#475569)]', className)} />;
}

/**
 * Dropdown following the active template theme via `--tpl-*`.
 *
 * @remarks The popup renders in a portal outside the tenant shell, so it
 * uses a fixed light surface instead of `--tpl-*` variables.
 * @param value - Currently selected option value.
 * @param onValueChange - Called with the new value on selection.
 * @param disabled - Disable the trigger while submitting.
 * @param options - Options rendered as select items.
 * @param placeholder - Hint shown when no value matches.
 * @param triggerId - Associates a {@link TemplateLabel} with the trigger.
 * @param triggerClassName - Caller shape classes appended after the theme.
 * @returns Tenant-themed select trigger with a light popup.
 */
export function TemplateMenuSelect({
  value,
  onValueChange,
  disabled = false,
  options,
  placeholder,
  triggerId,
  triggerClassName,
}: {
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly disabled?: boolean;
  readonly options: readonly TemplateOption[];
  readonly placeholder?: string;
  readonly triggerId?: string;
  readonly triggerClassName?: string;
}) {
  return (
    <Select
      value={value}
      onValueChange={(next) => onValueChange(String(next))}
      disabled={disabled}
      items={Object.fromEntries(options.map((option) => [option.value, option.label]))}
    >
      <SelectTrigger id={triggerId} className={templateFieldClasses(triggerClassName)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="border-slate-200 bg-white text-slate-900">
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value} label={option.label}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const TEMPLATE_NOTICE_TONE_CLASSES = {
  error: 'border-red-500/40 bg-red-500/10',
  success: 'border-emerald-500/40 bg-emerald-500/10',
} as const;

const TEMPLATE_NOTICE_ICON_CLASSES = {
  error: 'text-red-500',
  success: 'text-emerald-500',
} as const;

/**
 * Inline status notice with translucent tones readable on light and dark shells.
 *
 * @param tone - Error or success treatment with a matching icon.
 * @param title - Bold headline of the notice.
 * @param children - Detail lines rendered as the description.
 * @returns Shadcn alert adapted to tenant surfaces.
 */
export function TemplateNotice({
  tone,
  title,
  children,
}: {
  readonly tone: 'error' | 'success';
  readonly title: string;
  readonly children: ReactNode;
}) {
  const Icon = tone === 'error' ? TriangleAlert : CircleCheck;
  return (
    <Alert className={cn('font-sans', TEMPLATE_NOTICE_TONE_CLASSES[tone])}>
      <Icon className={TEMPLATE_NOTICE_ICON_CLASSES[tone]} aria-hidden="true" />
      <AlertTitle className="text-[var(--tpl-ink,#0f172a)]">{title}</AlertTitle>
      <AlertDescription className="text-[var(--tpl-muted,#475569)]">{children}</AlertDescription>
    </Alert>
  );
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
