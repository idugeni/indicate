import Link from 'next/link';
import type { ComponentType, ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { BrandPanel } from '@/modules/auth/components/brand-panel';

type AuthIcon = ComponentType<{ className?: string }>;

/** Page shell shared by all auth routes: brand ledger + focused form column. */
export function AuthPage({
  title,
  lede,
  children,
  footer,
}: {
  readonly title: string;
  readonly lede: string;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
}) {
  return (
    <main className="grid min-h-screen bg-bg text-paper md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <BrandPanel />

      <div className="flex flex-col justify-center px-6 py-12 md:px-14">
        <div className="mx-auto w-full max-w-md">
          <Link
            href="/"
            className="font-mono text-[11px] uppercase tracking-wider text-paper-faint transition-colors hover:text-paper"
          >
            ← Indicate
          </Link>
          <p className="m-0 mt-6 flex items-center gap-2.5 font-mono text-xs font-medium uppercase tracking-wider text-brass">
            <span aria-hidden="true" className="h-px w-8 flex-none bg-brass/70" />
            Akses workspace
          </p>
          <h1 className="m-0 mt-3 font-sans text-2xl font-bold tracking-tight text-paper">
            {title}
          </h1>
          <p className="m-0 mt-2 font-sans text-sm leading-relaxed text-paper-dim">
            {lede}
          </p>
          <div className="mt-8">{children}</div>
          {footer ? (
            <div className="mt-8 border-t border-hairline pt-5 font-sans text-xs text-paper-faint">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}

/** Shared auth notice; alert/status semantics live here, not copied per form. */
export function AuthAlert({
  tone,
  children,
}: {
  readonly tone: 'error' | 'success';
  readonly children: ReactNode;
}) {
  if (tone === 'error') {
    return (
      <div className="border-l-2 border-error bg-error/[0.07] px-4 py-3 text-sm leading-relaxed text-error" role="alert">
        {children}
      </div>
    );
  }
  return (
    <div className="border-l-2 border-signal bg-signal/[0.07] px-4 py-3 text-sm leading-relaxed text-paper" role="status">
      {children}
    </div>
  );
}

/** Shared auth field label. */
export function AuthLabel({
  htmlFor,
  children,
}: {
  readonly htmlFor: string;
  readonly icon?: AuthIcon;
  readonly children: ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block font-sans text-xs font-semibold text-paper">
      {children}
    </label>
  );
}

/** Full-width auth submit; the label swaps while busy, the icon stays. */
export function AuthSubmit({
  busy,
  busyLabel,
  icon: Icon,
  children,
}: {
  readonly busy: boolean;
  readonly busyLabel: string;
  readonly icon?: AuthIcon;
  readonly children: ReactNode;
}) {
  return (
    <Button type="submit" variant="default" size="lg" disabled={busy} className="w-full justify-center">
      {busy ? busyLabel : children} {Icon ? <Icon className="h-4 w-4" /> : null}
    </Button>
  );
}
