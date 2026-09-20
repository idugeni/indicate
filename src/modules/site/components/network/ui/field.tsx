import type { ComponentProps } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/ui/cn';

/**
 * Kelas tema field tenant bersama; gabungkan via `templateFieldClasses()`.
 *
 * @remarks
 * Sumber tunggal warna `--tpl-*` agar shadcn terlihat eksplisit tanpa duplikasi.
 */
export const TEMPLATE_FIELD_CLASSES =
  'border-[var(--tpl-ring,#e2e8f0)] bg-[var(--tpl-canvas,#f5f8fd)] text-[var(--tpl-ink,#0f172a)] [color-scheme:var(--tpl-scheme,light)] placeholder:text-[var(--tpl-faint,#94a3b8)] focus-visible:border-[var(--tpl-primary,#1a5fd0)] focus-visible:ring-[var(--tpl-primary-soft,#e8f0fe)] dark:border-[var(--tpl-ring,#e2e8f0)] dark:bg-[var(--tpl-canvas,#f5f8fd)] dark:text-[var(--tpl-ink,#0f172a)] dark:placeholder:text-[var(--tpl-faint,#94a3b8)] dark:focus-visible:border-[var(--tpl-primary,#1a5fd0)] dark:focus-visible:ring-[var(--tpl-primary-soft,#e8f0fe)] dark:disabled:bg-[var(--tpl-canvas,#f5f8fd)]';

/**
 * Terapkan tema field tenant bersama di atas primitif shadcn.
 *
 * @param className - Kelas bentuk pemanggil yang ditambahkan setelah tema.
 * @returns Kelas tema yang digabung dengan kelas pemanggil.
 */
export function templateFieldClasses(className?: string): string {
  return cn(TEMPLATE_FIELD_CLASSES, className);
}

/**
 * Terapkan tema tombol primer tenant bersama.
 *
 * @param className - Kelas bentuk pemanggil yang ditambahkan setelah tema.
 * @returns Kelas tema yang digabung dengan kelas pemanggil.
 */
export function templateButtonPrimaryClasses(className?: string): string {
  return cn(
    'bg-[var(--tpl-primary,#1a5fd0)] font-sans font-bold text-[var(--tpl-on-primary,#ffffff)] hover:bg-[var(--tpl-primary-dark,#155cb8)] dark:bg-[var(--tpl-primary,#1a5fd0)] dark:text-[var(--tpl-on-primary,#ffffff)] dark:hover:bg-[var(--tpl-primary-dark,#155cb8)]',
    className,
  );
}

/**
 * Terapkan tema tombol ghost tenant bersama.
 *
 * @param className - Kelas bentuk pemanggil yang ditambahkan setelah tema.
 * @returns Kelas tema yang digabung dengan kelas pemanggil.
 */
export function templateButtonGhostClasses(className?: string): string {
  return cn(
    'bg-transparent text-[var(--tpl-faint,#94a3b8)] hover:bg-[var(--tpl-ring,#e2e8f0)] hover:text-[var(--tpl-ink,#0f172a)] dark:bg-transparent dark:text-[var(--tpl-faint,#94a3b8)] dark:hover:bg-[var(--tpl-ring,#e2e8f0)] dark:hover:text-[var(--tpl-ink,#0f172a)]',
    className,
  );
}

/**
 * Input teks mengikuti tema template aktif via `--tpl-*`.
 *
 * @param props - Props input shadcn yang diteruskan.
 * @returns Input kebal root `.dark`; warna dari shell, bentuk dari pemanggil.
 */
export function TemplateInput({ className, ...props }: ComponentProps<typeof Input>) {
  return <Input {...props} className={templateFieldClasses(className)} />;
}

/**
 * Textarea mengikuti tema template aktif via `--tpl-*`.
 *
 * @param props - Props textarea shadcn yang diteruskan.
 * @returns Textarea kebal root `.dark`; warna dari shell, bentuk dari pemanggil.
 */
export function TemplateTextarea({ className, ...props }: ComponentProps<typeof Textarea>) {
  return <Textarea {...props} className={templateFieldClasses(className)} />;
}

/**
 * Select native mengikuti tema template aktif via `--tpl-*`.
 *
 * @param props - Props select yang diteruskan.
 * @returns Select kebal root `.dark`; warna dari shell, bentuk dari pemanggil.
 */
export function TemplateSelect({ className, ...props }: ComponentProps<'select'>) {
  return <select {...props} className={templateFieldClasses(className)} />;
}

/**
 * Props tombol template; `className` disengaja string agar bisa digabung via `cn()`.
 */
export type TemplateButtonProps = Omit<ComponentProps<typeof Button>, 'variant' | 'className'> & {
  readonly variant?: 'primary' | 'ghost';
  readonly className?: string | undefined;
};

/**
 * Tombol aksi mengikuti tema template aktif via `--tpl-*`.
 *
 * @param props - Props button shadcn plus varian `primary`/`ghost`.
 * @returns Tombol kebal root `.dark`; warna dari shell, bentuk dari pemanggil.
 */
export function TemplateButton({ className, variant = 'primary', ...props }: TemplateButtonProps) {
  if (variant === 'ghost') {
    return <Button variant="ghost" {...props} className={templateButtonGhostClasses(className)} />;
  }
  return <Button {...props} className={templateButtonPrimaryClasses(className)} />;
}
